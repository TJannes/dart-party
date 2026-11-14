import type { Dart } from './state'

/** The segments of a real board, clockwise from the top. */
export const RING: readonly number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
]

export const BULL = 25

/** The segment `steps` places clockwise of `segment` (negative: the other way). */
export function neighbour(segment: number, steps: number): number {
  const at = RING.indexOf(segment)
  if (at < 0) throw new Error(`Not a segment: ${segment}`)
  return RING[(((at + steps) % RING.length) + RING.length) % RING.length]!
}

/** The ordinary darts value: T20 is 60, the bull 50, a miss 0. */
export function dartScore(dart: Dart): number {
  return dart.miss || dart.number === null ? 0 : dart.number * dart.multiplier
}

/** A miss entered by hand on the control panel. */
export function manualMiss(): Dart {
  return { name: 'Miss', number: null, multiplier: 0, bed: 'Outside', miss: true, position: null }
}

/**
 * A dart entered or corrected by hand. It has no position. `inner` is for a
 * single between the bull and the triple ring, where a game cares.
 */
export function manualDart(number: number, multiplier: 1 | 2 | 3, inner = false): Dart {
  const isBull = number === BULL
  if (!isBull && !RING.includes(number)) throw new Error(`Not a segment: ${number}`)
  if (isBull && multiplier === 3) throw new Error('The bull has no triple')
  const name = isBull
    ? multiplier === 2
      ? 'Bull'
      : '25'
    : `${multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S'}${number}`
  const bed = isBull
    ? multiplier === 2
      ? 'Bull'
      : 'OuterBull'
    : multiplier === 3
      ? 'Triple'
      : multiplier === 2
        ? 'Double'
        : inner
          ? 'SingleInner'
          : 'SingleOuter'
  return { name, number, multiplier, bed, miss: false, position: null }
}
