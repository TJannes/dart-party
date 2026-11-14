import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { addDart, advance, dartsRemoved, nextPlayer, startEvening, type Evening } from '../evening/evening'
import { activeState } from '../evening/evening'
import { seededRandom } from '../random'
import { callFor, higherOrLower } from './higherOrLower'
import { lastOneStanding } from './lastOneStanding'
import { targetZone, timeBomb } from './timeBomb'
import type { Turn } from './types'

const three = ['ann', 'bob', 'cy']
const turn = (...darts: Dart[]): Turn => ({
  darts: darts.map((dart) => ({ dart, by: 'board' })),
  done: true,
})
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const D = (n: number) => manualDart(n, 2)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()

describe('Last One Standing', () => {
  const setup = { segments: { ann: [20], bob: [1], cy: [18] } as Record<string, [number]> }
  const play = (...turns: Turn[]) => lastOneStanding.evaluate(setup, three, turns)

  it('gives everyone a different segment', () => {
    for (let seed = 0; seed < 50; seed++) {
      const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      const { segments } = lastOneStanding.setup(eight, seededRandom(seed))
      expect(new Set(eight.map((p) => segments[p]![0])).size).toBe(8)
    }
  })

  it('takes one, two or three lives from the owner of the segment', () => {
    expect(play(turn(S(1))).view.lives).toEqual({ ann: 3, bob: 2, cy: 3 })
    expect(play(turn(D(1))).view.lives['bob']).toBe(1)
    expect(play(turn(T(1))).view.lives['bob']).toBe(0)
  })

  it('costs you a life when you hit your own segment', () => {
    const state = play(turn(S(20)))
    expect(state.view.lives['ann']).toBe(2)
    expect(state.feedback).toEqual(['bad'])
  })

  it('skips a player who is out', () => {
    const state = play(turn(T(1)), open())
    expect(state.view.out).toEqual(['bob'])
    expect(state.current).toMatchObject({ player: 'cy', round: 1 })
    expect(state.throwers).toEqual(['ann', 'cy'])
    const next = play(turn(T(1)), turn(miss))
    expect(next.current).toMatchObject({ player: 'ann', round: 2 })
  })

  it('ends your turn at once when you knock yourself out', () => {
    const state = play(open(T(20), T(1)))
    expect(state.view.lives).toEqual({ ann: 0, bob: 3, cy: 3 })
    expect(state.current).toMatchObject({ player: 'bob', turn: 1, dartsLeft: 3 })
  })

  it('does nothing on the segment of someone who is out', () => {
    const state = play(turn(T(1), S(1)))
    expect(state.feedback).toEqual(['great', 'neutral'])
  })

  it('is over when one player is left, ranked by when the others went', () => {
    const state = play(turn(T(1)), turn(T(20)))
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['cy'], ['ann'], ['bob']])
  })

  it('ends after ten rounds, the survivors ranked by lives', () => {
    const turns = [turn(S(1)), ...Array.from({ length: 29 }, () => turn(miss))]
    const state = play(...turns)
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['ann', 'cy'], ['bob']])
    expect(play(...turns.slice(0, -1)).finished).toBe(false)
  })
})

describe('Higher or Lower', () => {
  // Flips alternate, starting with "higher".
  const setup = { flips: Array.from({ length: 240 }, (_, i) => i % 2 === 0) }
  const play = (...turns: Turn[]) => higherOrLower.evaluate(setup, three, turns)

  it('never makes an impossible or near-impossible call', () => {
    expect(callFor(null, true)).toBeNull()
    expect(callFor(60, true)).toBe('lower')
    expect(callFor(30, true)).toBe('lower')
    expect(callFor(0, false)).toBe('higher')
    expect(callFor(5, false)).toBe('higher')
    expect(callFor(18, true)).toBe('higher')
    expect(callFor(18, false)).toBe('lower')
  })

  it('lets the first dart on the board set the bar for free', () => {
    const state = play(open(S(18)))
    expect(state.view).toMatchObject({ bar: 18, lives: { ann: 3 } })
    // The second flip says "lower".
    expect(state.view.call).toBe('lower')
  })

  it('takes a life for the wrong side, and for an equal dart', () => {
    expect(play(turn(S(18), S(20))).view.lives['ann']).toBe(2)
    expect(play(turn(S(18), S(18))).view.lives['ann']).toBe(2)
    expect(play(turn(S(18), S(10))).view.lives['ann']).toBe(3)
  })

  it('moves the bar to every dart on the board, right or wrong', () => {
    expect(play(turn(S(18), S(20))).view.bar).toBe(20)
  })

  it('always counts a miss as wrong and leaves the bar', () => {
    const state = play(turn(S(18), miss))
    expect(state.view).toMatchObject({ bar: 18, lives: { ann: 2 } })
    expect(play(turn(miss)).view).toMatchObject({ bar: null, lives: { ann: 2 } })
  })

  it('carries the bar over to the next player', () => {
    // ann leaves 10; the fourth dart of the game is called "lower".
    const state = play(turn(S(18), S(10), S(12)), open(S(11)))
    expect(state.view.lives).toEqual({ ann: 3, bob: 3, cy: 3 })
    expect(state.view.bar).toBe(11)
  })

  it('knocks a player out after three wrong darts and ends their turn', () => {
    const state = play(open(miss, miss, miss))
    expect(state.view.out).toEqual(['ann'])
    expect(state.current).toMatchObject({ player: 'bob', turn: 1 })
  })
})

describe('Time Bomb', () => {
  const setup = { fuses: [4, 5], targets: [20, 3, 6, 11, 8, 16, 2, 9] }
  const play = (...turns: Turn[]) => timeBomb.evaluate(setup, three, turns)

  it('has fuses of four to ten darts', () => {
    const { fuses, targets } = timeBomb.setup(three, seededRandom(4))
    expect(Math.min(...fuses)).toBeGreaterThanOrEqual(4)
    expect(Math.max(...fuses)).toBeLessThanOrEqual(10)
    expect(targets.length).toBeGreaterThanOrEqual(80)
  })

  it('makes the target a segment and its two neighbours', () => {
    expect(targetZone(20)).toEqual([5, 20, 1])
    expect(play().view.target).toEqual([5, 20, 1])
  })

  it('ends your turn safely when you hit the target, without burning fuse', () => {
    const state = play(open(S(7), T(1)))
    expect(state.view.burned).toBe(1)
    expect(state.current).toMatchObject({ player: 'bob', turn: 1, dartsLeft: 3 })
    expect(state.view.target).toEqual(targetZone(3))
    expect(state.feedback).toEqual(['neutral', 'great'])
  })

  it('goes off on the dart that burns the last of the fuse', () => {
    const state = play(turn(miss, miss, miss), open(S(7)))
    expect(state.view.lives).toEqual({ ann: 3, bob: 2, cy: 3 })
    expect(state.view).toMatchObject({ explosions: 1, burned: 0 })
    // The bomb went off: bob is done, cy starts the next bomb.
    expect(state.current).toMatchObject({ player: 'cy', turn: 2 })
  })

  it('gives the next bomb its own fuse', () => {
    const state = play(turn(miss, miss, miss), turn(miss), turn(miss, miss, miss), open(miss, miss))
    expect(state.view.explosions).toBe(2)
    expect(state.view.lives).toEqual({ ann: 2, bob: 2, cy: 3 })
  })

  it('lets the last player standing win', () => {
    const quick = { fuses: [1], targets: [20] }
    const state = timeBomb.evaluate(quick, ['ann', 'bob'], [
      turn(miss), turn(miss), turn(miss), turn(miss), turn(miss),
    ])
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['bob'], ['ann']])
  })
})

describe('an evening with a knockout game', () => {
  const people = three.map((id) => ({ id, name: id, avatar: 'fox' }))
  function begin(game: string): Evening {
    const random = seededRandom(3)
    return advance(advance(startEvening(people, 1, [game], random), random), random)
  }
  const thrower = (e: Evening) => activeState(e)!.current!.player

  it('starts the next turn when a rule ended one with darts still in the board', () => {
    let evening = begin('timeBomb')
    const first = thrower(evening)
    const [middle] = [activeState(evening)!.view.target[1]]
    evening = addDart(evening, manualDart(middle, 1), 'board')
    // The bomb was passed on: the turn is over though the dart is not pulled.
    expect(thrower(evening)).not.toBe(first)
    const second = thrower(evening)
    evening = addDart(evening, manualMiss(), 'board')
    const turns = evening.games[0]!.turns
    expect(turns).toHaveLength(2)
    expect(turns[0]).toMatchObject({ done: true })
    expect(turns[1]!.darts).toHaveLength(1)
    expect(thrower(evening)).toBe(second)
  })

  it('does not skip anyone when the darts of an ended turn are pulled', () => {
    let evening = begin('timeBomb')
    const middle = activeState(evening)!.view.target[1]
    evening = addDart(evening, manualDart(middle, 1), 'board')
    const second = thrower(evening)
    evening = dartsRemoved(evening)
    expect(thrower(evening)).toBe(second)
    evening = nextPlayer(evening)
    expect(thrower(evening)).not.toBe(second)
  })
})
