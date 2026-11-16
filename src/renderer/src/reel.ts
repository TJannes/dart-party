/**
 * The rows of the draw reel: `count - 1` filler names and then the drawn one.
 * The filler leaves out the drawn name, uses the others in shuffled rounds and
 * never shows the same name twice in a row, unless only one other name exists.
 */
export function reelRows(
  names: readonly string[],
  drawn: string,
  count: number,
  random: () => number = Math.random,
): string[] {
  const others = [...new Set(names)].filter((name) => name !== drawn)
  if (others.length === 0) return Array.from({ length: count }, () => drawn)

  const rows: string[] = []
  while (rows.length < count - 1) {
    const round = shuffle(others, random)
    // A new round must not start with the name the last round ended on.
    if (round.length > 1 && round[0] === rows.at(-1)) round.push(round.shift()!)
    rows.push(...round)
  }
  return [...rows.slice(0, count - 1), drawn]
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
