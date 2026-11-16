import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom } from '../random'
import { bullJump, trapRunner, TRAPS, type TrapRunnerSetup } from './trapRunner'
import { roundLimit, type Turn } from './types'

const players = ['ann', 'bob']
const turn = (...darts: Dart[]): Turn => ({ darts: darts.map((dart) => ({ dart, by: 'board' })), done: true })
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const T = (n: number) => manualDart(n, 3)
const bull = manualDart(25, 2)
const miss = manualMiss()

/** Traps under 18, 13 and 2 in the first round, under 20, 1 and 5 in the second, and so on by turns. */
const setup: TrapRunnerSetup = {
  traps: Array.from({ length: 10 }, (_, round) => (round % 2 === 0 ? [18, 13, 2] : [20, 1, 5])),
}
const play = (...turns: Turn[]) => trapRunner.evaluate(setup, players, turns)

describe('Trap Runner', () => {
  it('hides three different traps every round', () => {
    const { traps } = trapRunner.setup(players, seededRandom(3))
    expect(traps).toHaveLength(trapRunner.maxRounds)
    for (const round of traps) expect(new Set(round).size).toBe(TRAPS)
    expect(new Set(traps.map((round) => [...round].sort().join())).size).toBeGreaterThan(1)
  })

  it('takes one step for any dart on the board, whatever the ring', () => {
    const state = play(open(S(20), T(19), miss))
    expect(state.view.positions).toEqual({ ann: 2, bob: 0 })
    expect(state.feedback).toEqual(['good', 'good', 'bad'])
    expect(state.played[1]!.moments).toEqual([{ kind: 'scored', player: 'ann', amount: 1 }])
  })

  it('sends whoever falls into a trap back to the last rest stop and ends the turn', () => {
    // Ann walks to 7 in two rounds, then steps into the trap under 18.
    const state = play(turn(S(20), S(20), S(20)), turn(miss), turn(S(19), S(19), S(19)), turn(miss), open(S(20), S(18)))
    expect(state.view.positions.ann).toBe(5)
    expect(state.played.at(-1)!.moments).toEqual([
      { kind: 'trapped', player: 'ann', segment: 18, fell: 2 },
      { kind: 'lost', player: 'ann', amount: 2 },
    ])
    expect(state.feedback.at(-1)).toBe('bad')
    // The next dart is Bob's, before the darts are pulled.
    expect(state.current).toMatchObject({ player: 'bob', dartsLeft: 3 })
    expect(state.view.sprung).toEqual([18])
    expect(state.view.hidden).toBe(2)
  })

  it('loses nothing in a trap at a rest stop, but still ends the turn', () => {
    const state = play(open(S(18)))
    expect(state.view.positions.ann).toBe(0)
    expect(state.played[0]!.moments).toEqual([{ kind: 'trapped', player: 'ann', segment: 18, fell: 0 }])
    expect(state.current?.player).toBe('bob')
  })

  it('shows a sprung trap for the rest of the round only, and moves the traps', () => {
    expect(play(turn(S(18)), open(S(20))).view.sprung).toEqual([18])
    const next = play(turn(S(18)), turn(S(19)), open(S(18)))
    expect(next.view.sprung).toEqual([])
    expect(next.view.hidden).toBe(3)
    // The 18 is safe in the second round; the 20 is not.
    expect(next.view.positions.ann).toBe(1)
    expect(play(turn(S(18)), turn(S(19)), open(S(18), S(20))).view.positions.ann).toBe(0)
  })

  it('jumps to the next rest stop on the bull, and never over the finish', () => {
    expect([0, 3, 5, 9, 10, 12, 14].map(bullJump)).toEqual([5, 5, 10, 10, 14, 14, 14])
    const state = play(open(S(20), bull))
    expect(state.view.positions.ann).toBe(5)
    expect(state.feedback).toEqual(['good', 'great'])
  })

  it('is won by the first to reach 15, and ranks the rest by distance', () => {
    // Round by round: 3 safe steps for Ann, avoiding the traps of each round.
    const safe = (round: number) => (round % 2 === 0 ? S(19) : S(19))
    const turns: Turn[] = []
    for (let round = 0; round < 4; round++) turns.push(turn(safe(round), safe(round), safe(round)), turn(S(19)))
    expect(play(...turns).view.positions).toEqual({ ann: 12, bob: 4 })
    const end = play(...turns, open(S(19), S(19), S(19)))
    expect(end.finished).toBe(true)
    expect(end.view.winner).toBe('ann')
    expect(end.ranking).toEqual([['ann'], ['bob']])
    expect(play(...turns, open(S(19), S(19))).finished).toBe(false)
  })

  it('lasts about 40 turns at most', () => {
    expect([2, 3, 4, 5, 6, 7, 8].map((n) => roundLimit(trapRunner, n))).toEqual([10, 10, 10, 8, 7, 6, 5])
  })
})
