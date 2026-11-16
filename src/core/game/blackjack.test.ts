import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { blackjack, handOf, roundPoints, type Hand } from './blackjack'
import type { Turn } from './types'

const players = ['ann', 'bob', 'cy']
const turn = (...darts: Dart[]): Turn => ({ darts: darts.map((dart) => ({ dart, by: 'board' })), done: true })
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const D = (n: number) => manualDart(n, 2)
const T = (n: number) => manualDart(n, 3)
const bull = manualDart(25, 2)
const outerBull = manualDart(25, 1)
const miss = manualMiss()
const play = (...turns: Turn[]) => blackjack.evaluate(null, players, turns)

describe('Blackjack', () => {
  it('counts the number of the segment, whatever the ring', () => {
    expect(handOf([T(7), D(7), S(7)])).toEqual({ total: 21, bust: false })
    expect(handOf([S(20), miss])).toEqual({ total: 20, bust: false })
    expect(handOf([S(20), S(2)])).toEqual({ total: 22, bust: true })
  })

  it('counts a bull as 11, or as 1 when 11 would bust', () => {
    expect(handOf([bull])).toEqual({ total: 11, bust: false })
    expect(handOf([outerBull, S(10)])).toEqual({ total: 21, bust: false })
    expect(handOf([bull, S(15)])).toEqual({ total: 16, bust: false })
    expect(handOf([bull, outerBull])).toEqual({ total: 12, bust: false })
    expect(handOf([bull, S(15), S(6)])).toEqual({ total: 22, bust: true })
  })

  it('pays 3, 2 and 1 by closeness, 1 extra for 21, nothing for a bust or an empty hand', () => {
    const hands = (totals: Record<string, number>) =>
      new Map<string, Hand>(Object.entries(totals).map(([p, total]) => [p, { total, bust: total > 21 }]))
    expect(roundPoints(hands({ a: 19, b: 21, c: 12, d: 5, e: 25 }))).toEqual({ b: 4, a: 2, c: 1, d: 0 })
    // Equal hands share the place and the next one moves down.
    expect(roundPoints(hands({ a: 18, b: 18, c: 12 }))).toEqual({ a: 3, b: 3, c: 1 })
    expect(roundPoints(hands({ a: 0, b: 30 }))).toEqual({})
  })

  it('ends a turn on a bust or on 21, and lets the next dart count for the next player', () => {
    const bust = play(open(S(20), S(5)))
    expect(bust.current).toMatchObject({ player: 'bob', dartsLeft: 3, turn: 1 })
    expect(bust.feedback).toEqual(['good', 'bad'])
    expect(bust.played[1]!.moments).toEqual([{ kind: 'blank', player: 'ann' }])
    expect(bust.view.hands).toEqual({ ann: { total: 25, bust: true } })

    const exact = play(open(S(20), S(1)))
    expect(exact.current).toMatchObject({ player: 'bob', turn: 1 })
    expect(exact.feedback).toEqual(['good', 'great'])
  })

  it('lets a player stop by pulling the darts', () => {
    const throwing = play(open(S(17)))
    expect(throwing.current).toMatchObject({ player: 'ann', dartsLeft: 2 })
    // Still at the board: not yet a hand to beat.
    expect(throwing.view.toBeat).toBeNull()
    const stood = play(turn(S(17)))
    expect(stood.current).toMatchObject({ player: 'bob', dartsLeft: 3 })
    expect(stood.view.toBeat).toEqual({ total: 17, players: ['ann'] })
  })

  it('pays a round out once everyone has thrown, and remembers it', () => {
    const during = play(turn(S(17)), turn(S(20), S(5)))
    expect(during.view.scores).toEqual({ ann: 0, bob: 0, cy: 0 })
    const after = play(turn(S(17)), turn(S(20), S(5)), turn(S(20), S(1)))
    expect(after.view.scores).toEqual({ ann: 2, bob: 0, cy: 4 })
    expect(after.view.hands).toEqual({})
    // Pulled: the table is clear for the next player.
    expect(after.view.table).toBeNull()
    // The hand that closed the round lies there for as long as its darts are in the board.
    const lying = play(turn(S(17)), turn(S(20), S(5)), open(S(20), S(1)))
    expect(lying.current).toMatchObject({ player: 'bob', round: 2 })
    expect(lying.view.table).toEqual({ total: 21, bust: false, player: 'cy', cards: [20, 1], turn: 2 })
    expect(play(turn(S(17)), turn(S(20), S(5)), turn(S(20), S(1)), open(bull)).view.table).toMatchObject({
      player: 'bob',
      cards: [11],
    })
    expect(after.view.previous).toEqual({
      ann: { total: 17, bust: false, points: 2 },
      bob: { total: 25, bust: true, points: 0 },
      cy: { total: 21, bust: false, points: 4 },
    })
    expect(after.ranking).toEqual([['cy'], ['ann'], ['bob']])
  })

  it('moves the start up one player every round', () => {
    const stand = turn(S(10))
    const state = play(...Array.from({ length: 7 }, () => stand))
    expect(state.throwers).toEqual(['ann', 'bob', 'cy', 'bob', 'cy', 'ann', 'cy'])
    expect(state.current).toMatchObject({ player: 'ann', round: 3 })
  })

  it('ends after five rounds, on the last dart or the last takeout', () => {
    const before = Array.from({ length: 14 }, () => turn(S(10)))
    expect(play(...before, open(S(10))).finished).toBe(false)
    expect(play(...before, turn(S(10))).finished).toBe(true)
    expect(play(...before, open(S(20), S(5))).finished).toBe(true)
    expect(play(...before, open(S(1), S(1), S(1))).finished).toBe(true)
    const end = play(...before, turn(S(11)))
    // Five rounds level on 10, and the last thrower beats them once.
    const last = end.throwers.at(-1)!
    expect(end.ranking[0]).toEqual([last])
    expect(end.view.hands[last]).toEqual({ total: 11, bust: false })
  })
})
