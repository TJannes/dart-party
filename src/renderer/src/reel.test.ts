import { describe, expect, it } from 'vitest'
import { reelRows } from './reel'

const names = (n: number): string[] => Array.from({ length: n }, (_, i) => `Game ${i}`)

describe('reelRows', () => {
  it('ends on the drawn game and shows it nowhere else', () => {
    for (let n = 2; n <= 11; n++) {
      const rows = reelRows(names(n), 'Game 0', 18)
      expect(rows).toHaveLength(18)
      expect(rows.at(-1)).toBe('Game 0')
      expect(rows.slice(0, -1)).not.toContain('Game 0')
    }
  })

  it('never shows the same name twice in a row with three or more games', () => {
    for (let n = 3; n <= 11; n++) {
      for (let run = 0; run < 50; run++) {
        const rows = reelRows(names(n), 'Game 1', 18)
        rows.slice(1).forEach((row, i) => expect(row).not.toBe(rows[i]))
      }
    }
  })

  it('does not repeat one name over and over with seven games', () => {
    const rows = reelRows(names(7), 'Game 0', 18)
    expect(new Set(rows.slice(0, -1)).size).toBe(6)
  })

  it('shows only the drawn game when it is the only one', () => {
    expect(reelRows(['Solo'], 'Solo', 5)).toEqual(['Solo', 'Solo', 'Solo', 'Solo', 'Solo'])
  })
})
