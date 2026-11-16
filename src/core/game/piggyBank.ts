import { BULL, dartScore } from '../board/ring'
import type { Dart } from '../board/state'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Piggy Bank: every dart adds its value to your pig. A dart off the board
// (the surround, fully off, or a bounce-out) breaks the pig: you lose half
// of what was in it, rounded down.
//
// The money is at the edge: the double ring pays three times its number
// and the triple ring only once, so the big darts are the ones that land
// next to nothing. Playing it safe in the middle fills the pig slowly.

/** What the double ring pays: this many times the number of its segment. */
export const PIGGY_EDGE = 3

/** A dart this big is a golden coin. */
export const PIGGY_GOLD = 40

/** What a dart puts in the pig. The bull keeps its ordinary 25 and 50. */
export function piggyValue(dart: Dart): number {
  if (dart.miss || dart.number === null) return 0
  if (dart.number === BULL) return dartScore(dart)
  return dart.multiplier === 2 ? dart.number * PIGGY_EDGE : dart.number
}

export interface PiggyBankView {
  /** What is in each pig. */
  scores: Record<PlayerId, number>
  /** How often each pig was broken. */
  breaks: Record<PlayerId, number>
}

export const piggyBank: GameRules<null, PiggyBankView> = {
  id: 'piggyBank',
  dartsPerTurn: 3,
  maxRounds: 6,
  // A triple 20 is worth 20 here, so it is no feat, and a 180 cannot be thrown.
  feats: ['bullseye'],

  setup: () => null,

  evaluate(_setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    const breaks: Record<PlayerId, number> = {}
    for (const player of players) {
      scores[player] = 0
      breaks[player] = 0
    }
    const progress = playTurns(piggyBank, players, turns, (dart, thrower, _turn, _index, emit) => {
      if (dart.miss) {
        const half = Math.floor(scores[thrower]! / 2)
        scores[thrower]! -= half
        if (half > 0) emit({ kind: 'lost', player: thrower, amount: half })
        breaks[thrower]! += 1
        return 'bad'
      }
      const value = piggyValue(dart)
      scores[thrower]! += value
      if (value > 0) emit({ kind: 'scored', player: thrower, amount: value })
      return value >= PIGGY_GOLD ? 'great' : 'good'
    })
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores, breaks },
    }
  },
}
