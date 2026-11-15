import { RING } from '../board/ring'
import { playTurns, rankByScore, type DartFeedback, type GameRules, type PlayerId } from './types'

// Land Grab: the twenty segments are plots of land with a castle. Hit a free
// one to take it, hit your own to fortify it, hit someone else's to knock it
// down and take it. A double is two hits, a triple three; the bull does
// nothing.

export interface Plot {
  owner: PlayerId | null
  /** Two walls instead of one. */
  fortified: boolean
  /** Hits taken from attackers since the plot last changed hands. */
  damage: number
}

/** Hits a plot survives: it falls on the hit after these. */
export const hitsToFall = (plot: Plot): number => (plot.fortified ? 3 : 2)

export interface LandGrabView {
  plots: Record<number, Plot>
  /** Plots owned. */
  scores: Record<PlayerId, number>
  /** Of those, how many are fortified: the tie-break. */
  fortified: Record<PlayerId, number>
}

export const landGrab: GameRules<null, LandGrabView> = {
  id: 'landGrab',
  dartsPerTurn: 3,
  maxRounds: 6,

  setup: () => null,

  evaluate(_setup, players, turns) {
    const plots: Record<number, Plot> = {}
    for (const segment of RING) plots[segment] = { owner: null, fortified: false, damage: 0 }

    const progress = playTurns(landGrab, players, turns, (dart, thrower, _turn, _index, emit) => {
      if (dart.miss || dart.number === null) return 'bad'
      const plot = plots[dart.number]
      if (!plot) return 'neutral' // the bull
      let feedback: DartFeedback = 'neutral'
      // Wall-hits on each victim; a triple can hit two owners in a row.
      const hits = new Map<PlayerId, number>()
      // Each hit is played out on its own, so a triple can knock a castle
      // down, take it and start fortifying it in one dart.
      for (let hit = 0; hit < dart.multiplier; hit++) {
        if (plot.owner === null) {
          plot.owner = thrower
          feedback = 'great'
          emit({ kind: 'scored', player: thrower, amount: 1 })
        } else if (plot.owner === thrower) {
          if (!plot.fortified) {
            plot.fortified = true
            emit({ kind: 'fortified', player: thrower })
            if (feedback === 'neutral') feedback = 'good'
          }
        } else {
          const victim = plot.owner
          plot.damage += 1
          hits.set(victim, (hits.get(victim) ?? 0) + 1)
          feedback = 'attack'
          if (plot.damage >= hitsToFall(plot)) {
            emit({ kind: 'attacked', by: thrower, victim, amount: hits.get(victim)! })
            hits.delete(victim)
            emit({ kind: 'lost', player: victim, amount: 1 })
            emit({ kind: 'scored', player: thrower, amount: 1 })
            plot.owner = thrower
            plot.fortified = false
            plot.damage = 0
            feedback = 'great'
          }
        }
      }
      for (const [victim, amount] of hits) emit({ kind: 'attacked', by: thrower, victim, amount })
      return feedback
    })

    const scores: Record<PlayerId, number> = {}
    const fortified: Record<PlayerId, number> = {}
    for (const player of players) {
      scores[player] = 0
      fortified[player] = 0
    }
    for (const plot of Object.values(plots)) {
      if (plot.owner === null) continue
      scores[plot.owner]! += 1
      if (plot.fortified) fortified[plot.owner]! += 1
    }

    return {
      ...progress,
      // Most plots wins; level on plots, most fortified ones.
      ranking: rankByScore(players, (player) => scores[player]! * 100 + fortified[player]!),
      view: { plots, scores, fortified },
    }
  },
}
