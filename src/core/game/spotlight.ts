import { BULL, neighbour, RING } from '../board/ring'
import { shuffle } from '../random'
import { playTurns, rankByScore, settledForThrower, type GameRules, type PlayerId } from './types'

// Spotlight: each round a spotlight lands on one segment. That segment is
// worth 3, its neighbours 2, the ones next to those 1.

export interface SpotlightSetup {
  /** The target of each round. */
  targets: number[]
}

export interface SpotlightView {
  scores: Record<PlayerId, number>
  /** The target of the round being played, or of the last one when over. */
  target: number
  /** What each segment is worth this round; segments worth nothing are absent. */
  worth: Record<number, number>
}

/** What each segment is worth with the spotlight on `target`. */
export function spotlightWorth(target: number): Record<number, number> {
  return {
    [target]: 3,
    [neighbour(target, 1)]: 2,
    [neighbour(target, -1)]: 2,
    [neighbour(target, 2)]: 1,
    [neighbour(target, -2)]: 1,
  }
}

export const spotlight: GameRules<SpotlightSetup, SpotlightView> = {
  id: 'spotlight',
  dartsPerTurn: 3,
  maxRounds: 6,

  // Six different segments, so no round repeats another.
  setup: (_players, random) => ({ targets: shuffle(random, RING).slice(0, spotlight.maxRounds) }),

  evaluate(setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    const targetOf = (round: number): number => setup.targets[round % setup.targets.length]!
    /** What each turn has brought so far. */
    const earned: number[] = []

    const progress = playTurns(spotlight, players, turns, (dart, thrower, turnIndex, dartIndex, emit) => {
      const round = Math.floor(turnIndex / players.length)
      // Doubles and triples count no extra; the bull scores nothing.
      const onRing = !dart.miss && dart.number !== null && dart.number !== BULL
      const points = onRing ? (spotlightWorth(targetOf(round))[dart.number!] ?? 0) : 0
      scores[thrower]! += points
      earned[turnIndex] = (earned[turnIndex] ?? 0) + points
      if (points > 0) emit({ kind: 'scored', player: thrower, amount: points })
      // Three darts and nothing to show for it.
      if (dartIndex === spotlight.dartsPerTurn - 1 && earned[turnIndex] === 0) emit({ kind: 'blank', player: thrower })
      if (dart.miss || dart.number === null) return 'bad'
      return points === 3 ? 'great' : points > 0 ? 'good' : 'neutral'
    }, {
      // At most the spotlit segment a dart.
      settled: (thrower, left) =>
        settledForThrower(players, scores, thrower, scores[thrower]!, scores[thrower]! + 3 * left),
    })

    const round = (progress.current?.round ?? spotlight.maxRounds) - 1
    const target = targetOf(round)
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores, target, worth: spotlightWorth(target) },
    }
  },
}
