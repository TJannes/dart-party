import { decider } from './decider'
import { landGrab } from './landGrab'
import { piggyBank } from './piggyBank'
import { race } from './race'
import { robinHood } from './robinHood'
import { spotlight } from './spotlight'
import type { GameRules } from './types'

/** The mini-games that can be drawn in an evening, in menu order. */
export const drawableGames: readonly GameRules<any, any>[] = [
  race,
  robinHood,
  spotlight,
  piggyBank,
  landGrab,
]

const all: readonly GameRules<any, any>[] = [...drawableGames, decider]

export function rulesFor(gameId: string): GameRules<any, any> {
  const rules = all.find((game) => game.id === gameId)
  if (!rules) throw new Error(`Unknown game: ${gameId}`)
  return rules
}
