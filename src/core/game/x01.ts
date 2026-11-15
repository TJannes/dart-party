import { BULL, dartScore, manualDart, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// X01: count down from a start score to exactly zero. A dart that goes
// below zero is a bust: the turn is over and the score goes back to what it
// was when the turn began. With double out the last dart must be a double
// (the bullseye counts), so leaving 1 is a bust too. Free play only.

export const X01_STARTS = [301, 501, 701] as const

export interface X01Setup {
  start: number
  doubleOut: boolean
}

export interface X01View {
  start: number
  doubleOut: boolean
  /** Points still to go. */
  remaining: Record<PlayerId, number>
  /** Who went bust with the last dart that counted, if anyone. */
  bust: PlayerId | null
  /** How the player at the board can finish with the darts they have left. */
  checkout: Dart[] | null
}

/** A setup as sent by a window, made safe. */
export function cleanX01Setup(raw: unknown): X01Setup {
  const given = typeof raw === 'object' && raw !== null ? (raw as Partial<X01Setup>) : {}
  return {
    start: X01_STARTS.includes(given.start as (typeof X01_STARTS)[number]) ? given.start! : 501,
    doubleOut: given.doubleOut !== false,
  }
}

// ------------------------------------------------------------- checkouts

/** Doubles to finish on, most wanted first: they halve to another double. */
const FINISH_ORDER = [20, 16, 8, 18, 12, 10, 4, 2, 14, 6, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1]

/** Every dart that scores, with how hard it is to hit on purpose. */
const SCORING: { dart: Dart; value: number; hard: number; bull: boolean }[] = [
  ...RING.map((n) => ({ dart: manualDart(n, 3), value: n * 3, hard: 2, bull: false })),
  ...RING.map((n) => ({ dart: manualDart(n, 1), value: n, hard: 0, bull: false })),
  { dart: manualDart(BULL, 1), value: 25, hard: 1, bull: false },
  ...RING.map((n) => ({ dart: manualDart(n, 2), value: n * 2, hard: 3, bull: false })),
  { dart: manualDart(BULL, 2), value: 50, hard: 4, bull: true },
]

type Option = (typeof SCORING)[number]

/** The last dart of a finish: it must take out exactly `left`. */
function closers(left: number, doubleOut: boolean): { option: Option; want: number }[] {
  const key = doubleOut ? left : -left
  let found = CLOSERS.get(key)
  if (!found) CLOSERS.set(key, (found = findClosers(left, doubleOut)))
  return found
}

const CLOSERS = new Map<number, { option: Option; want: number }[]>()

function findClosers(left: number, doubleOut: boolean): { option: Option; want: number }[] {
  return SCORING.filter(
    (option) => option.value === left && (!doubleOut || option.dart.multiplier === 2),
  ).map((option) => ({
    option,
    // Among doubles the handy ones first; the bullseye last.
    want: option.dart.multiplier === 2 && !option.bull ? FINISH_ORDER.indexOf(option.dart.number!) : 0,
  }))
}

/** True when `a` comes before `b`, comparing number by number. */
function before(a: readonly number[], b: readonly number[]): boolean {
  const at = a.findIndex((value, i) => value !== b[i])
  return at >= 0 && a[at]! < b[at]!
}

/**
 * The route to finish from `remaining` with at most `darts` darts, or null
 * when it cannot be done. It avoids the bullseye where another route
 * exists, then takes the fewest darts, then the easiest ones (singles
 * before triples), then the handiest double to end on.
 */
export function checkout(remaining: number, darts: number, doubleOut: boolean): Dart[] | null {
  if (remaining < 1 || remaining > 180 || darts < 1) return null
  let best: { route: Option[]; rank: number[] } | null = null
  const consider = (lead: Option[], left: number): void => {
    for (const { option, want } of closers(left, doubleOut)) {
      const route = [...lead, option]
      // The double that ends a double-out game is not counted as hard: it has to be one anyway.
      const hard = lead.reduce((sum, o) => sum + o.hard, 0) + (doubleOut && !option.bull ? 0 : option.hard)
      const rank = [
        route.filter((o) => o.bull).length,
        route.length,
        hard,
        want,
        // The biggest dart first, so the route reads as it is thrown.
        -(lead[0]?.value ?? 0),
        -(lead[1]?.value ?? 0),
      ]
      const better = best === null || before(rank, best.rank)
      if (better) best = { route, rank }
    }
  }
  consider([], remaining)
  if (darts >= 2) for (const a of SCORING) if (a.value < remaining) consider([a], remaining - a.value)
  if (darts >= 3) {
    for (const a of SCORING) {
      for (const b of SCORING) {
        if (a.value + b.value < remaining) consider([a, b], remaining - a.value - b.value)
      }
    }
  }
  const found = best as { route: Option[] } | null
  return found ? found.route.map((option) => option.dart) : null
}

export const x01: GameRules<X01Setup, X01View> = {
  id: 'x01',
  dartsPerTurn: 3,
  // No limit: a leg lasts until someone is out.
  maxRounds: Infinity,
  feats: ['bullseye', 'triple20', 'oneEighty'],

  setup: () => ({ start: 501, doubleOut: true }),

  evaluate(setup, players, turns) {
    const remaining: Record<PlayerId, number> = {}
    for (const player of players) remaining[player] = setup.start
    let atTurnStart = setup.start
    let bust: PlayerId | null = null

    const progress = playTurns(x01, players, turns, (dart, thrower, _turn, dartIndex, emit) => {
      if (dartIndex === 0) atTurnStart = remaining[thrower]!
      bust = null
      const value = dartScore(dart)
      const left = remaining[thrower]! - value
      const onDouble = dart.multiplier === 2
      if (left < 0 || (setup.doubleOut && (left === 1 || (left === 0 && !onDouble)))) {
        const undone = atTurnStart - remaining[thrower]!
        remaining[thrower] = atTurnStart
        bust = thrower
        if (undone > 0) emit({ kind: 'lost', player: thrower, amount: undone })
        return { feedback: 'bad', endTurn: true }
      }
      remaining[thrower] = left
      if (value > 0) emit({ kind: 'scored', player: thrower, amount: value })
      if (left === 0) return { feedback: 'great', finish: true }
      return value === 0 ? 'bad' : value >= 40 ? 'great' : 'good'
    })

    return {
      ...progress,
      ranking: rankByScore(players, (player) => -remaining[player]!),
      view: {
        start: setup.start,
        doubleOut: setup.doubleOut,
        remaining,
        bust,
        checkout: progress.current
          ? checkout(remaining[progress.current.player]!, progress.current.dartsLeft, setup.doubleOut)
          : null,
      },
    }
  },
}
