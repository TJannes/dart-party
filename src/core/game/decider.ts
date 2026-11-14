import { dartScore } from '../board/ring'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// The deciding round for a tie at the top of the final standings: three
// darts each, highest ordinary score wins. It is never in the draw.

export interface DeciderView {
  scores: Record<PlayerId, number>
}

export const decider: GameRules<null, DeciderView> = {
  id: 'decider',
  dartsPerTurn: 3,
  maxRounds: 1,

  setup: () => null,

  evaluate(_setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    const progress = playTurns(decider, players, turns, (dart, thrower) => {
      const score = dartScore(dart)
      scores[thrower]! += score
      return score === 0 ? 'bad' : score >= 40 ? 'great' : 'good'
    })
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores },
    }
  },
}
