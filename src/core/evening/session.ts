import type { BoardEvent } from '../board/events'
import { BULL, manualDart, manualMiss, placedDart, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { drawableGames } from '../game/registry'
import type { PlayerId, Ranking } from '../game/types'
import type { Random } from '../random'
import {
  addDart,
  advance,
  applyBoardEvent,
  correctDart,
  evaluateRecord,
  finalRanking,
  nextPlayer,
  removeLastDart,
  standings,
  startEvening,
  type Evening,
  type Player,
} from './evening'

// The evening as the app runs it: one at a time, saved after every change so
// a crash or restart picks up where it was, and written to the history when
// it is over. Storage is passed in, so this has no Electron in it.

/** A dart as the control panel enters it. */
export type DartInput =
  | { miss: true }
  | { miss?: false; number: number; multiplier: 1 | 2 | 3; /** An inner single. */ inner?: boolean }
  /** Pointed at on the board, in board coordinates. */
  | { position: { x: number; y: number } }

export type EveningCommand =
  | { type: 'start'; players: Player[]; games: number }
  /** Continue: past the draw, the rules card, a finished game. */
  | { type: 'advance' }
  | { type: 'addDart'; dart: DartInput }
  | { type: 'correctDart'; turn: number; index: number; dart: DartInput }
  | { type: 'removeLastDart' }
  | { type: 'nextPlayer' }
  /** Stop the evening without a result. */
  | { type: 'abort' }
  /** Leave the podium: the result goes to the history. */
  | { type: 'finish' }

/** The result of a finished evening, as kept for the hall of fame. */
export interface EveningResult {
  finishedAt: string
  players: Player[]
  ranking: Ranking
  points: Record<PlayerId, number>
  games: string[]
}

/** Named JSON documents that survive a restart. */
export interface Store {
  /** Null when there is nothing saved, or it cannot be read. */
  load(name: string): unknown
  save(name: string, data: unknown): void
  remove(name: string): void
}

const EVENING = 'evening'
const HISTORY = 'history'
const FORMAT = 1

function toDart(input: DartInput): Dart | null {
  if ('position' in input) {
    const { x, y } = input.position ?? {}
    const sane = (n: unknown): n is number => typeof n === 'number' && Math.abs(n) <= 1.5
    return sane(x) && sane(y) ? placedDart(x, y) : null
  }
  if (input.miss) return manualMiss()
  const { number, multiplier } = input
  const known = RING.includes(number) || (number === BULL && multiplier !== 3)
  if (!known || ![1, 2, 3].includes(multiplier)) return null
  return manualDart(number, multiplier, input.inner === true)
}

/** A saved evening is only resumed if every game in it can be recounted. */
function readSavedEvening(saved: unknown): Evening | null {
  try {
    const { format, evening } = saved as { format?: unknown; evening?: Evening }
    if (format !== FORMAT || !evening) return null
    for (const record of [...evening.games, ...evening.deciders]) evaluateRecord(record)
    standings(evening)
    finalRanking(evening)
    return evening
  } catch {
    return null
  }
}

export class EveningSession {
  private evening: Evening | null

  constructor(
    private readonly store: Store,
    private readonly random: Random,
    private readonly onChange: (evening: Evening | null) => void = () => {},
    private readonly now: () => Date = () => new Date(),
    /** The mini-games that may be drawn in an evening started now. */
    private readonly games: () => string[] = () => drawableGames.map((game) => game.id),
  ) {
    this.evening = readSavedEvening(store.load(EVENING))
  }

  get current(): Evening | null {
    return this.evening
  }

  get history(): EveningResult[] {
    const saved = this.store.load(HISTORY)
    return Array.isArray(saved) ? (saved as EveningResult[]) : []
  }

  boardEvent(event: BoardEvent): void {
    if (this.evening) this.set(applyBoardEvent(this.evening, event))
  }

  command(command: EveningCommand): void {
    if (command.type === 'start') {
      // Players are fixed once an evening starts; abort it first.
      if (this.evening) return
      try {
        this.set(startEvening(command.players, command.games, this.games(), this.random))
      } catch {
        // Not a valid evening: nothing starts.
      }
      return
    }

    const evening = this.evening
    if (!evening) return
    switch (command.type) {
      case 'advance':
        return this.set(advance(evening, this.random))
      case 'addDart': {
        const dart = toDart(command.dart)
        return dart ? this.set(addDart(evening, dart, 'hand')) : undefined
      }
      case 'correctDart': {
        const dart = toDart(command.dart)
        return dart ? this.set(correctDart(evening, command.turn, command.index, dart)) : undefined
      }
      case 'removeLastDart':
        return this.set(removeLastDart(evening))
      case 'nextPlayer':
        return this.set(nextPlayer(evening))
      case 'abort':
        return this.set(null)
      case 'finish':
        if (evening.stage !== 'podium') return
        this.store.save(HISTORY, [...this.history, this.result(evening)])
        return this.set(null)
    }
  }

  private result(evening: Evening): EveningResult {
    const points: Record<PlayerId, number> = {}
    for (const row of standings(evening)) points[row.player] = row.points
    return {
      finishedAt: this.now().toISOString(),
      players: evening.players,
      ranking: finalRanking(evening),
      points,
      games: evening.games.map((record) => record.gameId),
    }
  }

  private set(next: Evening | null): void {
    if (next === this.evening) return
    this.evening = next
    if (next) this.store.save(EVENING, { format: FORMAT, evening: next })
    else this.store.remove(EVENING)
    this.onChange(next)
  }
}
