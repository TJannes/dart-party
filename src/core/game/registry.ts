import { decider } from './decider'
import { race } from './race'
import type { GameRules } from './types'

/** The mini-games that can be drawn in an evening, in menu order. */
export const drawableGames: readonly GameRules<any, any>[] = [race]

const all: readonly GameRules<any, any>[] = [...drawableGames, decider]

export function rulesFor(gameId: string): GameRules<any, any> {
  const rules = all.find((game) => game.id === gameId)
  if (!rules) throw new Error(`Unknown game: ${gameId}`)
  return rules
}
