import { BULL, RING } from '../board/ring'
import { shuffle } from '../random'
import { playTurns, rankByScore, roundsWithin, settledForThrower, type GameRules, type PlayerId } from './types'

// Trap Runner: everyone walks from 0 to 15. Any dart on the board is one
// step, whatever the ring. Three segments hide a trap, new every round and
// the same for everyone in it: fall in and you are back at your last rest
// stop, and your turn is over. The bull jumps to the next rest stop.

export const TRAP_TRACK_LENGTH = 15

/** Every this many steps there is a rest stop: a trap never takes you back further. */
export const REST_EVERY = 5

/** How many segments hide a trap in a round. */
export const TRAPS = 3

export interface TrapRunnerSetup {
  /** The trap segments of each round. */
  traps: number[][]
}

export interface TrapRunnerView {
  trackLength: number
  restEvery: number
  /** Steps from the start, 0 to trackLength. */
  positions: Record<PlayerId, number>
  /** The traps of this round that someone has fallen into: they show until the round is over. */
  sprung: number[]
  /** How many traps of this round are still hidden. */
  hidden: number
  winner: PlayerId | null
}

/** The rest stop at or behind a position. */
export const restStop = (position: number): number => Math.floor(position / REST_EVERY) * REST_EVERY

/** Where the bull takes you: the next rest stop, or one step short of the finish. */
export function bullJump(position: number): number {
  const next = restStop(position) + REST_EVERY
  return next < TRAP_TRACK_LENGTH ? next : Math.max(position, TRAP_TRACK_LENGTH - 1)
}

export const trapRunner: GameRules<TrapRunnerSetup, TrapRunnerView> = {
  id: 'trapRunner',
  dartsPerTurn: 3,
  maxRounds: 10,
  // About 40 turns in all, as in Race.
  roundsFor: roundsWithin(40, 10),

  setup: (_players, random) => ({
    traps: Array.from({ length: trapRunner.maxRounds }, () => shuffle(random, RING).slice(0, TRAPS)),
  }),

  evaluate(setup, players, turns) {
    const positions: Record<PlayerId, number> = {}
    for (const player of players) positions[player] = 0
    const trapsOf = (round: number): number[] => setup.traps[round % setup.traps.length]!
    /** Per round, the traps someone fell into. */
    const sprung: number[][] = []
    let winner: PlayerId | null = null

    const progress = playTurns(trapRunner, players, turns, (dart, thrower, turnIndex, _index, emit) => {
      if (dart.miss || dart.number === null) return 'bad'
      const round = Math.floor(turnIndex / players.length)
      const from = positions[thrower]!
      if (trapsOf(round).includes(dart.number)) {
        const shown = (sprung[round] ??= [])
        if (!shown.includes(dart.number)) shown.push(dart.number)
        const to = restStop(from)
        positions[thrower] = to
        emit({ kind: 'trapped', player: thrower, segment: dart.number, fell: from - to })
        if (from > to) emit({ kind: 'lost', player: thrower, amount: from - to })
        return { feedback: 'bad', endTurn: true }
      }
      const bull = dart.number === BULL
      const to = bull ? bullJump(from) : from + 1
      if (to === from) return 'neutral'
      positions[thrower] = to
      emit({ kind: 'scored', player: thrower, amount: to - from })
      const feedback = bull ? 'great' : 'good'
      if (to >= TRAP_TRACK_LENGTH) {
        winner = thrower
        return { feedback, finish: true }
      }
      return feedback
    }, {
      // Back to the last rest stop at worst; a bull to the next one with every dart at best.
      settled: (thrower, darts) => {
        const now = positions[thrower]!
        const high = Math.min(TRAP_TRACK_LENGTH, now + REST_EVERY * darts)
        return settledForThrower(players, positions, thrower, restStop(now), high)
      },
    })

    const round = (progress.current?.round ?? sprung.length) - 1
    const shown = sprung[round] ?? []
    return {
      ...progress,
      ranking: rankByScore(players, (player) => positions[player]!),
      view: {
        trackLength: TRAP_TRACK_LENGTH,
        restEvery: REST_EVERY,
        positions,
        sprung: shown,
        hidden: TRAPS - shown.length,
        winner,
      },
    }
  },
}
