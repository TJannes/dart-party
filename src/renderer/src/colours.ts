import type { Party } from '../../core/party/party'
import type { PlayerId } from '../../core/game/types'
import { theme } from './theme'

/** One colour per seat in a party, from the theme. */
export const PLAYER_COLOURS = theme.playerColours

export function colourOf(party: Party, player: PlayerId): string {
  const seat = party.players.findIndex((p) => p.id === player)
  return PLAYER_COLOURS[Math.max(0, seat) % PLAYER_COLOURS.length]!
}

export function playerOf(party: Party, player: PlayerId) {
  return party.players.find((p) => p.id === player)!
}
