import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Around the Clock: hit 1 to 20 in order. Any single, double or triple of
// your number counts once. The first to hit the 20 wins. Free play only.

export const LAST_TARGET = 20

export interface AroundTheClockView {
  /** The number each player must hit next; 21 means done. */
  targets: Record<PlayerId, number>
}

export const aroundTheClock: GameRules<null, AroundTheClockView> = {
  id: 'aroundTheClock',
  dartsPerTurn: 3,
  // No limit: it lasts until someone has gone all the way round.
  maxRounds: Infinity,

  setup: () => null,

  evaluate(_setup, players, turns) {
    const targets: Record<PlayerId, number> = {}
    for (const player of players) targets[player] = 1

    const progress = playTurns(aroundTheClock, players, turns, (dart, thrower, _turn, _index, emit) => {
      if (dart.miss || dart.number === null) return 'bad'
      if (dart.number !== targets[thrower]) return 'neutral'
      targets[thrower]! += 1
      emit({ kind: 'scored', player: thrower, amount: 1 })
      return targets[thrower]! > LAST_TARGET ? { feedback: 'great', finish: true } : 'good'
    })

    return {
      ...progress,
      ranking: rankByScore(players, (player) => targets[player]!),
      view: { targets },
    }
  },
}
