import type { BoardTracker } from '../../core/board/tracker'

// The connection to Autodarts Desktop's local API. All it does is move bytes:
// what they mean is decided by the BoardTracker.
//
// Safety: the only request here that changes anything is POST /api/reset.
// GET /api/config returns the board's cloud credentials and is never called.

const RETRY_MS = 2000
const POLL_MS = 2000
const REQUEST_TIMEOUT_MS = 3000

export class AutodartsClient {
  private socket: WebSocket | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = true

  constructor(
    private readonly tracker: BoardTracker,
    private readonly address: string,
  ) {}

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    this.teardown()
  }

  /** Resets the board. The only state-changing call this app makes. */
  async reset(): Promise<void> {
    try {
      await fetch(`http://${this.address}/api/reset`, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      // The poll notices a dead connection; a stuck board is retried.
    }
  }

  private connect(): void {
    let socket: WebSocket
    try {
      socket = new WebSocket(`ws://${this.address}/api/events`)
    } catch {
      return this.fail(null)
    }
    this.socket = socket

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return
      // Messages only come when something changes, so ask where we are. The
      // poll is also the safety net for a socket that dies silently.
      void this.poll(socket)
      this.pollTimer = setInterval(() => void this.poll(socket), POLL_MS)
    })
    socket.addEventListener('message', (event) => {
      if (this.socket !== socket) return
      let message: unknown
      try {
        message = JSON.parse(String(event.data))
      } catch {
        message = null
      }
      this.tracker.receiveMessage(message)
    })
    socket.addEventListener('close', () => this.fail(socket))
    socket.addEventListener('error', () => this.fail(socket))
  }

  private async poll(socket: WebSocket): Promise<void> {
    let state: unknown
    try {
      const response = await fetch(`http://${this.address}/api/state`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      // Not JSON, or an error page: let the tracker call it unexpected.
      state = response.ok ? await response.json().catch(() => null) : null
    } catch {
      return this.fail(socket)
    }
    if (this.socket === socket) this.tracker.receiveState(state)
  }

  /** The connection is gone: say so and try again shortly. */
  private fail(socket: WebSocket | null): void {
    if (this.socket !== socket || this.stopped) return
    this.teardown()
    this.tracker.linkDown()
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (!this.stopped) this.connect()
    }, RETRY_MS)
  }

  private teardown(): void {
    if (this.pollTimer !== null) clearInterval(this.pollTimer)
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.pollTimer = null
    this.retryTimer = null
    const socket = this.socket
    this.socket = null
    try {
      socket?.close()
    } catch {
      // Already closed.
    }
  }
}
