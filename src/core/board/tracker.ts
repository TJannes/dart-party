import { diffStates, type BoardEvent } from './events'
import {
  boardCondition,
  parseBoardState,
  UnexpectedShapeError,
  type BoardCondition,
  type BoardState,
  type Dart,
} from './state'

export type LinkStatus =
  /** Not reached yet since the app started. */
  | 'connecting'
  | 'online'
  /** Autodarts is not running, or not at the configured address. */
  | 'offline'
  /** Something answers, but not in a shape this app understands. */
  | 'unexpected'

/** Everything a window needs to show the state of the board. */
export interface BoardSnapshot {
  link: LinkStatus
  /** Null until the first state has arrived. */
  condition: BoardCondition | null
  cloudConnected: boolean | null
  throws: Dart[]
}

export interface BoardTrackerOptions {
  onEvent: (event: BoardEvent) => void
  onSnapshot?: (snapshot: BoardSnapshot) => void
  /** Sends `POST /api/reset`. Failures are the caller's to swallow. */
  resetBoard: () => void
  /**
   * How long the board may stay stuck before it is reset. The pause gives a
   * hand that is still in view time to leave.
   */
  resetDelayMs?: number
}

/**
 * Turns what comes in from Autodarts into board events, keeps the current
 * snapshot, and resets a stuck board. It does no I/O itself: the connection
 * feeds it and is told when to reset.
 */
export class BoardTracker {
  private state: BoardState | null = null
  private link: LinkStatus = 'connecting'
  private pendingReset: ReturnType<typeof setTimeout> | null = null
  private published = ''
  private readonly resetDelayMs: number

  constructor(private readonly options: BoardTrackerOptions) {
    this.resetDelayMs = options.resetDelayMs ?? 2000
  }

  get snapshot(): BoardSnapshot {
    return {
      link: this.link,
      condition: this.state ? boardCondition(this.state) : null,
      cloudConnected: this.state ? this.state.cloudConnected : null,
      throws: this.state ? this.state.throws : [],
    }
  }

  /** A message from the WebSocket `/api/events`, already JSON-decoded. */
  receiveMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null) return this.unexpected('empty message')
    const { type, data } = message as { type?: unknown; data?: unknown }
    // Only state messages have been seen. Others are not ours to judge.
    if (type !== 'state') return
    this.receiveState(data)
  }

  /** An answer of `GET /api/state`, or the data of a state message. */
  receiveState(raw: unknown): void {
    let next: BoardState
    try {
      next = parseBoardState(raw)
    } catch (error) {
      if (!(error instanceof UnexpectedShapeError)) throw error
      return this.unexpected(error.message)
    }

    const events = diffStates(this.state, next)
    if (this.link !== 'online') {
      if (this.link === 'offline') events.unshift({ type: 'connectionRestored' })
      this.link = 'online'
    }
    this.state = next
    this.planRecovery()
    this.publish(events)
  }

  /** The connection to Autodarts failed or closed. */
  linkDown(): void {
    this.cancelRecovery()
    if (this.link === 'offline') return
    const wasUp = this.link === 'online' || this.link === 'unexpected'
    this.link = 'offline'
    this.publish(wasUp ? [{ type: 'connectionLost' }] : [])
  }

  /** Stops the pending reset. Call when the tracker is no longer used. */
  dispose(): void {
    this.cancelRecovery()
  }

  private unexpected(message: string): void {
    this.cancelRecovery()
    if (this.link === 'unexpected') return
    this.link = 'unexpected'
    this.publish([{ type: 'unexpectedData', message }])
  }

  private planRecovery(): void {
    const stuck = this.state !== null && boardCondition(this.state) === 'stuck'
    if (!stuck) return this.cancelRecovery()
    if (this.pendingReset !== null) return
    this.pendingReset = setTimeout(() => {
      this.pendingReset = null
      this.options.resetBoard()
      // If the reset does not take (or the hand is still there), try again.
      this.planRecovery()
    }, this.resetDelayMs)
  }

  private cancelRecovery(): void {
    if (this.pendingReset === null) return
    clearTimeout(this.pendingReset)
    this.pendingReset = null
  }

  private publish(events: BoardEvent[]): void {
    // The state is polled as well as pushed, so most calls change nothing.
    const snapshot = this.snapshot
    const serialised = JSON.stringify(snapshot)
    if (serialised !== this.published) {
      this.published = serialised
      this.options.onSnapshot?.(snapshot)
    }
    for (const event of events) this.options.onEvent(event)
  }
}
