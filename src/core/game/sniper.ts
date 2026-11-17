import type { Dart } from '../board/state'
import { playTurns, rankByScore, roundLimit, type DartFeedback, type GameRules, type PlayerId, type Ranking } from './types'

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

/** Everyone's total over the first `count` rounds. */
function totals(
  players: readonly PlayerId[],
  rounds: readonly Map<PlayerId, { mm: number }>[],
  count: number,
): Record<PlayerId, number> {
  const scores: Record<PlayerId, number> = {}
  for (const player of players) scores[player] = 0
  for (let round = 0; round < count; round++) {
    const closest = new Map([...(rounds[round] ?? [])].map(([player, c]) => [player, c.mm]))
    for (const [player, points] of Object.entries(roundPoints(closest))) scores[player]! += points
  }
  return scores
}

const sameRanking = (a: Ranking, b: Ranking): boolean =>
  a.length === b.length && a.every((group, i) => [...group].sort().join() === [...b[i]!].sort().join())

/**
 * Whether the thrower of the very last turn can still change the final
 * standings with the darts they have left. Their closest dart can only get
 * closer, which also pushes others down a place, so it is enough to try a
 * distance level with, just inside and just outside every other player's.
 */
function stillOpen(
  players: readonly PlayerId[],
  before: Record<PlayerId, number>,
  closest: Map<PlayerId, { mm: number }>,
  thrower: PlayerId,
): boolean {
  const standings = (own: number | null): Ranking => {
    const round = new Map([...closest].map(([player, c]) => [player, c.mm]))
    if (own === null) round.delete(thrower)
    else round.set(thrower, own)
    const points = roundPoints(round)
    return rankByScore(players, (player) => before[player]! + (points[player] ?? 0))
  }
  const own = closest.get(thrower)?.mm ?? null
  const now = standings(own)
  const reachable = (mm: number) => mm >= 0 && (own === null || Math.round(mm) < Math.round(own))
  for (const [player, c] of closest) {
    if (player === thrower) continue
    const level = Math.round(c.mm)
    for (const mm of [level - 1, level, level + 1]) {
      if (reachable(mm) && !sameRanking(standings(mm), now)) return true
    }
  }
  // With nobody else on the board, any placed dart wins the round.
  return reachable(0) && !sameRanking(standings(0), now)
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
    const lastRound = roundLimit(sniper, players.length) - 1

    const progress = playTurns(sniper, players, turns, (dart, thrower, turnIndex, dartIndex, emit) => {
      const round = Math.floor(turnIndex / players.length)
      const closest = (rounds[round] ??= new Map())
      const target = targetOf(round)
      const mm = distanceMm(dart, target)
      let feedback: DartFeedback = 'bad'
      if (mm !== null) {
        emit({ kind: 'measured', player: thrower, mm, target })
        const leader = Math.min(...[...closest.values()].map((c) => c.mm))
        const own = closest.get(thrower)
        if (own && own.mm <= mm) feedback = 'neutral'
        else {
          closest.set(thrower, { at: dart.position!, mm })
          feedback = mm < leader ? 'great' : 'good'
        }
      }
      // The last dart of the last player closes the round. In the last
      // round the game ends as soon as the darts left can change nothing.
      // Not through `settled`: the round result has to go with this dart.
      const lastThrower = turnIndex % players.length === players.length - 1
      const lastDart = dartIndex === sniper.dartsPerTurn - 1
      const decided =
        lastThrower &&
        !lastDart &&
        round === lastRound &&
        !stillOpen(players, totals(players, rounds, round), closest, thrower)
      if (lastThrower && (lastDart || decided) && closest.size > 0) {
        const places = [...closest].sort((a, b) => a[1].mm - b[1].mm).slice(0, PLACE_POINTS.length)
        emit({ kind: 'roundResult', places: places.map(([player, c]) => ({ player, at: c.at })) })
      }
      return decided ? { feedback, finish: true as const } : feedback
    })

    // A round only pays out once everyone has thrown in it.
    const finishedRounds = progress.current ? progress.current.round - 1 : lastRound + 1
    const scores = totals(players, rounds, finishedRounds)

    const round = (progress.current?.round ?? lastRound + 1) - 1
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

