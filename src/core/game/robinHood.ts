import { BULL } from '../board/ring'
import type { Dart } from '../board/state'
import { playTurns, rankByScore, settledForThrower, type GameRules, type PlayerId } from './types'

// Robin Hood: the board is an archery target. Only the distance from the
// centre counts; the number and the thin rings mean nothing.

/** The outer edge of the inner single, as a share of the board radius. */
const TRIPLE_RING = 0.582

/**
 * The points of a dart: bullseye 6, outer bull 5, inner single 4, anything
 * further out on the board 3, a miss 0. Zones follow the wires, so this
 * goes by the bed Autodarts reports, not by the measured position.
 */
export function archeryPoints(dart: Dart): 0 | 3 | 4 | 5 | 6 {
  if (dart.miss || dart.number === null) return 0
  if (dart.number === BULL) return dart.multiplier === 2 ? 6 : 5
  if (dart.multiplier !== 1) return 3
  if (dart.bed === 'SingleInner') return 4
  if (dart.bed === 'SingleOuter') return 3
  // A bed name never seen before: fall back on where the dart is.
  if (dart.position && Math.hypot(dart.position.x, dart.position.y) < TRIPLE_RING) return 4
  return 3
}

export interface RobinHoodView {
  scores: Record<PlayerId, number>
}

export const robinHood: GameRules<null, RobinHoodView> = {
  id: 'robinHood',
  dartsPerTurn: 3,
  maxRounds: 6,
  feats: ['bullseye'],

  setup: () => null,

  evaluate(_setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    const progress = playTurns(robinHood, players, turns, (dart, thrower, _turn, _index, emit) => {
      const points = archeryPoints(dart)
      scores[thrower]! += points
      if (points > 0) emit({ kind: 'scored', player: thrower, amount: points })
      return points === 0 ? 'bad' : points >= 5 ? 'great' : points === 4 ? 'good' : 'neutral'
    }, {
      // At most a bullseye a dart.
      settled: (thrower, left) =>
        settledForThrower(players, scores, thrower, scores[thrower]!, scores[thrower]! + 6 * left),
    })
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores },
    }
  },
}
