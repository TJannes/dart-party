import type { Evening } from '../../core/evening/evening'
import type { PlayerId } from '../../core/game/types'
import { theme } from './theme'

/** One colour per seat in an evening, from the theme. */
export const PLAYER_COLOURS = theme.playerColours

export function colourOf(evening: Evening, player: PlayerId): string {
  const seat = evening.players.findIndex((p) => p.id === player)
  return PLAYER_COLOURS[Math.max(0, seat) % PLAYER_COLOURS.length]!
}

export function playerOf(evening: Evening, player: PlayerId) {
  return evening.players.find((p) => p.id === player)!
}
