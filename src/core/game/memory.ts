import { RING } from '../board/ring'
import { shuffle } from '../random'
import { playTurns, rankByScore, roundsWithin, type GameRules, type PlayerId } from './types'

// Memory: under the twenty segments lie cards, five pictures four times
// each. A dart turns over the card it hits. Two open cards with the same
// picture in one turn are a pair for the thrower and leave the board. What
// is still open when the turn ends turns back, for everyone to remember.

export const PICTURES = ['star', 'heart', 'clover', 'diamond', 'triangle'] as const
export type Picture = (typeof PICTURES)[number]

/** How often each picture lies on the board. */
export const COPIES = 4

export interface MemorySetup {
  under: Record<number, Picture>
}

export interface MemoryView {
  /** Pairs taken. */
  scores: Record<PlayerId, number>
  /** The picture of every pair a player took, in the order taken. */
  pairs: Record<PlayerId, Picture[]>
  /** The cards that lie open: those of the turn in progress. */
  open: Record<number, Picture>
  /** The segments whose card is gone, and who took it. */
  taken: Record<number, PlayerId>
  /** How many cards still lie on the board. */
  left: number
}

export const memory: GameRules<MemorySetup, MemoryView> = {
  id: 'memory',
  dartsPerTurn: 3,
  maxRounds: 6,
  // About 24 turns in all: with more players the board would be empty long before six rounds.
  roundsFor: roundsWithin(24, 6),
  // Most turns turn cards over without a pair.
  emptyTurnsAreNormal: true,

  setup(_players, random) {
    const cards = shuffle(
      random,
      PICTURES.flatMap((picture) => Array.from({ length: COPIES }, () => picture)),
    )
    const under: MemorySetup['under'] = {}
    RING.forEach((segment, index) => (under[segment] = cards[index]!))
    return { under }
  },

  evaluate(setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    const pairs: Record<PlayerId, Picture[]> = {}
    for (const player of players) {
      scores[player] = 0
      pairs[player] = []
    }
    const taken: Record<number, PlayerId> = {}
    let left = Object.keys(setup.under).length
    /** The cards opened in each turn that are still on the board. */
    const opened: number[][] = []

    const progress = playTurns(memory, players, turns, (dart, thrower, turnIndex, _index, emit) => {
      const open = (opened[turnIndex] ??= [])
      if (dart.miss || dart.number === null) return 'bad'
      const picture = setup.under[dart.number]
      // The bull, a card that is gone, or one that already lies open.
      if (picture === undefined || taken[dart.number] !== undefined || open.includes(dart.number)) return 'neutral'
      const match = open.find((segment) => setup.under[segment] === picture)
      if (match === undefined) {
        open.push(dart.number)
        emit({ kind: 'flipped', player: thrower, segment: dart.number, picture, match: null })
        return 'neutral'
      }
      open.splice(open.indexOf(match), 1)
      taken[dart.number] = thrower
      taken[match] = thrower
      left -= 2
      scores[thrower]! += 1
      pairs[thrower]!.push(picture)
      emit({ kind: 'flipped', player: thrower, segment: dart.number, picture, match })
      emit({ kind: 'scored', player: thrower, amount: 1 })
      // With every card gone there is nothing left to play for.
      return left === 0 ? { feedback: 'great', finish: true } : 'great'
    })

    // Open cards turn back when the turn is over: only the turn in progress shows any.
    const turn = progress.current?.turn
    const showing = turn !== undefined && turns[turn] ? (opened[turn] ?? []) : []
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: {
        scores,
        pairs,
        open: Object.fromEntries(showing.map((segment) => [segment, setup.under[segment]!])),
        taken,
        left,
      },
    }
  },
}
