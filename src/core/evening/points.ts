import type { PlayerId, Ranking } from '../game/types'

/**
 * Points for a finished game. With n players, first place earns n, second
 * n-1, and so on down to 1. Tied players all get the points of the highest
 * place they share, and the next player drops by as many places: 4-4-2-1.
 */
export function pointsForRanking(ranking: Ranking): Record<PlayerId, number> {
  const players = ranking.reduce((sum, group) => sum + group.length, 0)
  const points: Record<PlayerId, number> = {}
  let place = 0
  for (const group of ranking) {
    for (const player of group) points[player] = players - place
    place += group.length
  }
  return points
}

/** The place of each player: tied players share one, the next skips. */
export function placesOf(ranking: Ranking): Record<PlayerId, number> {
  const places: Record<PlayerId, number> = {}
  let place = 1
  for (const group of ranking) {
    for (const player of group) places[player] = place
    place += group.length
  }
  return places
}
