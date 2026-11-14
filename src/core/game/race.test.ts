import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom } from '../random'
import { race, type RaceSetup } from './race'
import type { Turn } from './types'

const players = ['ann', 'bob', 'cy']
const setup: RaceSetup = { segments: { ann: [20, 1], bob: [18, 4], cy: [13, 6] } }

const turn = (...darts: Dart[]): Turn => ({
  darts: darts.map((dart) => ({ dart, by: 'board' })),
  done: true,
})
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const D = (n: number) => manualDart(n, 2)
const T = (n: number) => manualDart(n, 3)
const play = (...turns: Turn[]) => race.evaluate(setup, players, turns)

describe('dealing segments', () => {
  it('gives every player two neighbouring segments, none shared', () => {
    for (let seed = 0; seed < 200; seed++) {
      const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      const { segments } = race.setup(eight, seededRandom(seed))
      const seen = new Set<number>()
      for (const player of eight) {
        const [first, second] = segments[player]!
        const gap = Math.abs(RING.indexOf(first) - RING.indexOf(second))
        expect(gap === 1 || gap === RING.length - 1).toBe(true)
        seen.add(first).add(second)
      }
      expect(seen.size).toBe(16)
    }
  })

  it('does not always cut the ring in the same place', () => {
    const firsts = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      firsts.add(race.setup(['a', 'b'], seededRandom(seed)).segments['a']!.join('-'))
    }
    // With a fixed cut only ten pairs could ever come up.
    expect(firsts.size).toBeGreaterThan(10)
  })
})

describe('moving', () => {
  it('moves you forward 1, 2 or 3 steps on your own segments', () => {
    const { view } = play(turn(S(20), D(1), T(20)))
    expect(view.positions).toEqual({ ann: 6, bob: 0, cy: 0 })
    expect(view.moves.map((m) => [m.player, m.from, m.to])).toEqual([
      ['ann', 0, 1],
      ['ann', 1, 3],
      ['ann', 3, 6],
    ])
  })

  it('pushes another player back when you hit their segment', () => {
    const { view } = play(turn(T(20), S(20)), turn(D(1), S(18)))
    expect(view.positions).toEqual({ ann: 2, bob: 1, cy: 0 })
    expect(view.moves.at(-2)).toMatchObject({ thrower: 'bob', player: 'ann', from: 4, to: 2 })
  })

  it('never pushes anyone behind the start', () => {
    const { view } = play(turn(S(20)), turn(T(20), T(1)))
    expect(view.positions['ann']).toBe(0)
    // The second push changed nothing, so there is nothing to animate.
    expect(view.moves).toHaveLength(2)
  })

  it('ignores misses, the bull and segments nobody owns', () => {
    const { view } = play(turn(manualMiss(), manualDart(25, 2), T(5)))
    expect(view.positions).toEqual({ ann: 0, bob: 0, cy: 0 })
    expect(view.moves).toEqual([])
  })
})

describe('turns', () => {
  it('starts with the first player, three darts, round 1', () => {
    expect(play().current).toEqual({ player: 'ann', round: 1, dartsLeft: 3 })
  })

  it('counts down the darts of an open turn', () => {
    expect(play(open(S(20))).current).toEqual({ player: 'ann', round: 1, dartsLeft: 2 })
    expect(play(open(S(20), S(20), S(20))).current).toMatchObject({ player: 'ann', dartsLeft: 0 })
  })

  it('passes to the next player and the next round', () => {
    expect(play(turn(S(20))).current).toEqual({ player: 'bob', round: 1, dartsLeft: 3 })
    expect(play(turn(), turn(), turn()).current).toEqual({ player: 'ann', round: 2, dartsLeft: 3 })
  })

  it('ignores a fourth dart in a turn', () => {
    expect(play(turn(S(20), S(20), S(20), T(20))).view.positions['ann']).toBe(3)
  })
})

describe('finishing', () => {
  const sprint = [turn(T(20), T(20), T(20)), turn(S(18)), turn()]

  it('ends at once when someone crosses the finish, mid-turn', () => {
    const state = play(...sprint, open(S(20), T(20)))
    expect(state.finished).toBe(true)
    expect(state.current).toBeNull()
    expect(state.view.winner).toBe('ann')
    expect(state.view.positions['ann']).toBe(10)
    expect(state.ranking).toEqual([['ann'], ['bob'], ['cy']])
  })

  it('does not count anything thrown after the finish', () => {
    const state = play(...sprint, turn(S(20), T(20), T(20)), turn(T(18)))
    expect(state.view.positions).toEqual({ ann: 10, bob: 1, cy: 0 })
  })

  it('ranks the rest by distance, level players sharing a place', () => {
    const state = play(turn(T(20), T(20), T(20)), turn(), turn(), turn(S(1)))
    expect(state.ranking).toEqual([['ann'], ['bob', 'cy']])
  })

  it('ends after ten rounds, with the furthest player first', () => {
    const turns = [turn(S(20)), turn(D(18)), turn(D(13))]
    while (turns.length < 30) turns.push(turn())
    const state = play(...turns)
    expect(state.finished).toBe(true)
    expect(state.view.winner).toBeNull()
    expect(state.ranking).toEqual([['bob', 'cy'], ['ann']])
    expect(play(...turns.slice(0, 29)).finished).toBe(false)
  })

  it('ends on the last dart of the last turn, without waiting for the takeout', () => {
    const turns = Array.from({ length: 29 }, () => turn())
    expect(play(...turns, open(S(5), S(5))).finished).toBe(false)
    expect(play(...turns, open(S(5), S(5), S(5))).finished).toBe(true)
  })

  it('reopens the game when the winning dart is corrected away', () => {
    const state = play(...sprint, open(manualMiss(), manualMiss()))
    expect(state.finished).toBe(false)
    expect(state.current).toEqual({ player: 'ann', round: 2, dartsLeft: 1 })
  })
})
