import type { Dart } from '../board/state'
import { playTurns, rankByScore, type DartFeedback, type GameRules, type PlayerId } from './types'

// Sniper: each round a cross appears somewhere on the board, the same for
// everyone. Your closest dart of three counts. The closest player of the
// round gets 3 points, the second 2, the third 1.

/** The board radius in millimetres: positions are in units of this. */
export const BOARD_RADIUS_MM = 170

/** Points for the first three places of a round. */
const PLACE_POINTS = [3, 2, 1]

export interface Point {
  x: number
  y: number
}

export interface SniperSetup {
  /** Where the cross is in each round. */
  targets: Point[]
}

export interface SniperView {
  scores: Record<PlayerId, number>
  /** The cross of the round being played, or of the last one when over. */
  target: Point
  /** Each player's closest dart this round; absent until they place one. */
  closest: Record<PlayerId, { at: Point; mm: number }>
}

/** How far a dart is from the cross, in millimetres. Null if it has no position. */
export function distanceMm(dart: Dart, target: Point): number | null {
  if (!dart.position) return null
  return Math.hypot(dart.position.x - target.x, dart.position.y - target.y) * BOARD_RADIUS_MM
}

/** The points of one finished round, from everyone's closest distance. */
function roundPoints(closest: Map<PlayerId, number>): Record<PlayerId, number> {
  // Players level to the millimetre share a place, as in the standings.
  const ranking = rankByScore([...closest.keys()], (player) => -Math.round(closest.get(player)!))
  const points: Record<PlayerId, number> = {}
  let place = 0
  for (const group of ranking) {
    for (const player of group) points[player] = PLACE_POINTS[place] ?? 0
    place += group.length
  }
  return points
}

export const sniper: GameRules<SniperSetup, SniperView> = {
  id: 'sniper',
  dartsPerTurn: 3,
  maxRounds: 5,

  setup(_players, random) {
    const targets: Point[] = []
    for (let round = 0; round < sniper.maxRounds; round++) {
      // Anywhere inside the double ring, every spot equally likely.
      const radius = Math.sqrt(random()) * 0.95
      const angle = random() * 2 * Math.PI
      targets.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) })
    }
    return { targets }
  },

  evaluate(setup, players, turns) {
    const targetOf = (round: number): Point => setup.targets[round % setup.targets.length]!
    /** Per round, each player's closest distance and where that dart is. */
    const rounds: Map<PlayerId, { at: Point; mm: number }>[] = []

    const progress = playTurns(sniper, players, turns, (dart, thrower, turnIndex): DartFeedback => {
      const round = Math.floor(turnIndex / players.length)
      const closest = (rounds[round] ??= new Map())
      const mm = distanceMm(dart, targetOf(round))
      if (mm === null) return 'bad'
      const leader = Math.min(...[...closest.values()].map((c) => c.mm))
      const own = closest.get(thrower)
      if (own && own.mm <= mm) return 'neutral'
      closest.set(thrower, { at: dart.position!, mm })
      return mm < leader ? 'great' : 'good'
    })

    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    // A round only pays out once everyone has thrown in it.
    const finishedRounds = progress.current ? progress.current.round - 1 : sniper.maxRounds
    for (let round = 0; round < finishedRounds; round++) {
      const closest = new Map([...(rounds[round] ?? [])].map(([player, c]) => [player, c.mm]))
      for (const [player, points] of Object.entries(roundPoints(closest))) scores[player]! += points
    }

    const round = (progress.current?.round ?? sniper.maxRounds) - 1
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: {
        scores,
        target: targetOf(round),
        closest: Object.fromEntries(rounds[round] ?? []),
      },
    }
  },
}

