import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom } from '../random'
import { COPIES, memory, PICTURES, type MemorySetup, type Picture } from './memory'
import { roundLimit, type Turn } from './types'

const players = ['ann', 'bob']
const turn = (...darts: Dart[]): Turn => ({ darts: darts.map((dart) => ({ dart, by: 'board' })), done: true })
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()

/** Clockwise from the 20: star, heart, clover, diamond, triangle, and round again. */
const setup: MemorySetup = {
  under: Object.fromEntries(RING.map((segment, index) => [segment, PICTURES[index % PICTURES.length]!])),
}
// So 20, 6, 3 and 11 are stars; 1, 10, 19 and 14 hearts; 18, 15, 7 and 9 clovers.
const play = (...turns: Turn[]) => memory.evaluate(setup, players, turns)

describe('Memory', () => {
  it('deals every picture four times', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { under } = memory.setup(players, seededRandom(seed))
      const count: Partial<Record<Picture, number>> = {}
      for (const segment of RING) count[under[segment]!] = (count[under[segment]!] ?? 0) + 1
      expect(count).toEqual(Object.fromEntries(PICTURES.map((picture) => [picture, COPIES])))
    }
  })

  it('turns a card over and shows it while the turn lasts', () => {
    const state = play(open(S(20), T(1)))
    expect(state.view.open).toEqual({ 20: 'star', 1: 'heart' })
    expect(state.feedback).toEqual(['neutral', 'neutral'])
    expect(state.played[0]!.moments).toEqual([
      { kind: 'flipped', player: 'ann', segment: 20, picture: 'star', match: null },
    ])
    // Pulled: the cards turn back and nobody has anything.
    const after = play(turn(S(20), T(1)))
    expect(after.view.open).toEqual({})
    expect(after.view.left).toBe(20)
    expect(after.view.scores).toEqual({ ann: 0, bob: 0 })
  })

  it('gives a pair to whoever opens two of a picture in one turn', () => {
    const state = play(open(S(20), S(1), S(6)))
    expect(state.view.scores).toEqual({ ann: 1, bob: 0 })
    expect(state.view.pairs.ann).toEqual(['star'])
    expect(state.view.taken).toEqual({ 20: 'ann', 6: 'ann' })
    expect(state.view.open).toEqual({ 1: 'heart' })
    expect(state.view.left).toBe(18)
    expect(state.feedback).toEqual(['neutral', 'neutral', 'great'])
    expect(state.played[2]!.moments).toEqual([
      { kind: 'flipped', player: 'ann', segment: 6, picture: 'star', match: 20 },
      { kind: 'scored', player: 'ann', amount: 1 },
    ])
  })

  it('needs both cards in the same turn', () => {
    const state = play(turn(S(20)), open(S(6)))
    expect(state.view.scores).toEqual({ ann: 0, bob: 0 })
    expect(state.view.open).toEqual({ 6: 'star' })
  })

  it('does nothing on the bull, a card that is gone, a card already open, or off the board', () => {
    const state = play(turn(S(20), S(6), S(20)), open(manualDart(25, 2), S(1), S(1)), )
    expect(state.feedback).toEqual(['neutral', 'great', 'neutral', 'neutral', 'neutral', 'neutral'])
    expect(state.view.open).toEqual({ 1: 'heart' })
    expect(play(open(miss)).feedback).toEqual(['bad'])
    // A third star after a pair lies open on its own.
    expect(play(open(S(20), S(6), S(3))).view.open).toEqual({ 3: 'star' })
  })

  it('ends at once when the last card is taken', () => {
    const order = PICTURES.flatMap((_, n) => RING.filter((_, index) => index % PICTURES.length === n))
    // Three cards a turn: every other card of a picture closes a pair.
    const all: Turn[] = []
    for (let n = 0; n < order.length; n += 2) all.push(turn(S(order[n]!), S(order[n + 1]!)))
    expect(play(...all.slice(0, -1)).finished).toBe(false)
    const end = play(...all.slice(0, -1), open(S(order.at(-2)!), S(order.at(-1)!)))
    expect(end.finished).toBe(true)
    expect(end.view.left).toBe(0)
    expect(end.view.scores).toEqual({ ann: 5, bob: 5 })
    expect(end.ranking).toEqual([['ann', 'bob']])
  })

  it('lasts about 24 turns', () => {
    expect([2, 3, 4, 5, 6, 7, 8].map((n) => roundLimit(memory, n))).toEqual([6, 6, 6, 5, 4, 3, 3])
  })
})
