import { aroundTheClock } from './aroundTheClock'
import { blackjack } from './blackjack'
import { decider } from './decider'
import { higherOrLower } from './higherOrLower'
import { landGrab } from './landGrab'
import { lastOneStanding } from './lastOneStanding'
import { memory } from './memory'
import { minefield } from './minefield'
import { piggyBank } from './piggyBank'
import { race } from './race'
import { raiseTheBar } from './raiseTheBar'
import { robinHood } from './robinHood'
import { sniper } from './sniper'
import { spotlight } from './spotlight'
import { timeBomb } from './timeBomb'
import type { GameRules } from './types'
import { x01 } from './x01'

/** The mini-games that can be drawn in a party, in menu order. */
export const drawableGames: readonly GameRules<any, any>[] = [
  race,
  robinHood,
  spotlight,
  piggyBank,
  landGrab,
  sniper,
  minefield,
  lastOneStanding,
  higherOrLower,
  timeBomb,
  raiseTheBar,
  blackjack,
  memory,
]

/** Played on their own, outside a party. Never in the draw. */
export const freePlayGames: readonly GameRules<any, any>[] = [x01, aroundTheClock]

const all: readonly GameRules<any, any>[] = [...drawableGames, decider, ...freePlayGames]

export function rulesFor(gameId: string): GameRules<any, any> {
  const rules = all.find((game) => game.id === gameId)
  if (!rules) throw new Error(`Unknown game: ${gameId}`)
  return rules
}
