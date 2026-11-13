/** A source of random numbers in [0, 1), like Math.random. */
export type Random = () => number

/** A repeatable random source (mulberry32), for tests and replays. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(random: Random, below: number): number {
  return Math.floor(random() * below)
}

export function pick<T>(random: Random, items: readonly T[]): T {
  if (items.length === 0) throw new Error('Cannot pick from an empty list')
  return items[randomInt(random, items.length)]!
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(random: Random, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(random, i + 1)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
