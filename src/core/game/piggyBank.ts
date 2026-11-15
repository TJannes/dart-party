import { dartScore } from '../board/ring'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Piggy Bank: every dart adds its ordinary value to your pig. A dart off the
// board (the surround, fully off, or a bounce-out) breaks the pig: you lose
// half of what was in it, rounded down.

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
  feats: ['bullseye', 'triple20', 'oneEighty'],

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
      const value = dartScore(dart)
      scores[thrower]! += value
      if (value > 0) emit({ kind: 'scored', player: thrower, amount: value })
      return value >= 40 ? 'great' : 'good'
    })
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores, breaks },
    }
  },
}
