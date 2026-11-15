import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { cueBetween } from '../party/cues'
import {
  activeState,
  addDart,
  advance,
  dartsRemoved,
  playAgain,
  startFreePlay,
  type Party,
  type Player,
} from '../party/party'
import { PartySession, type Store } from '../party/session'
import { seededRandom } from '../random'
import { aroundTheClock } from './aroundTheClock'
import type { Turn } from './types'
import { checkout, cleanX01Setup, x01 } from './x01'

const turn = (...darts: Dart[]): Turn => ({ darts: darts.map((dart) => ({ dart, by: 'board' })), done: true })
const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
const S = (n: number) => manualDart(n, 1)
const D = (n: number) => manualDart(n, 2)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()
const people = (...names: string[]): Player[] => names.map((name) => ({ id: name, name, avatar: 'fox' }))

describe('X01', () => {
  const play = (setup: { start: number; doubleOut: boolean }, ...turns: Turn[]) => x01.evaluate(setup, ['ann', 'bob'], turns)
  const double = { start: 301, doubleOut: true }
  const straight = { start: 301, doubleOut: false }
  /** Ann throws 180 and 81 and stands on 40; bob misses in between. */
  const to40 = [turn(T(20), T(20), T(20)), turn(miss), turn(T(20), S(20), S(1)), turn(miss)]

  it('counts down from the start score', () => {
    const state = play(double, turn(T(20), S(5), miss))
    expect(state.view.remaining).toEqual({ ann: 236, bob: 301 })
    expect(state.feedback).toEqual(['great', 'good', 'bad'])
    expect(state.current).toMatchObject({ player: 'bob', round: 1 })
  })

  it('is won by a double that lands exactly on zero', () => {
    const state = play(double, ...to40, open(D(20)))
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['ann'], ['bob']])
    expect(state.view.remaining['ann']).toBe(0)
  })

  it('counts the bullseye as a double', () => {
    const to50 = [turn(T(20), T(20), T(20)), turn(miss), turn(T(20), S(11)), turn(miss)]
    expect(play(double, ...to50, open(manualDart(25, 2))).finished).toBe(true)
  })

  it('goes bust below zero, on one, or on zero without a double', () => {
    // Below zero; 39 leaves one; twice 20 lands on zero without a double.
    for (const darts of [[T(20)], [T(13)], [S(20), S(20)]]) {
      const dart = darts[0]!
      const state = play(double, ...to40, open(...darts))
      expect(state.finished, dart.name).toBe(false)
      expect(state.view.remaining['ann'], dart.name).toBe(40)
      expect(state.view.bust, dart.name).toBe('ann')
      expect(state.feedback.at(-1), dart.name).toBe('bad')
    }
  })

  it('ends the turn on a bust: the next dart is for the next player', () => {
    const state = play(double, ...to40, open(S(10), T(20)))
    expect(state.view.remaining['ann']).toBe(40)
    expect(state.current).toMatchObject({ player: 'bob', dartsLeft: 3, turn: 5 })
    expect(state.played.at(-1)!.moments).toEqual([{ kind: 'lost', player: 'ann', amount: 10 }])
    // A dart thrown after the bust in the same turn does not count.
    expect(play(double, ...to40, open(S(10), T(20), D(15))).view.remaining['ann']).toBe(40)
  })

  it('does not celebrate a triple 20 that goes bust', () => {
    const before = startFreePlay(people('ann'), 'x01', { start: 301, doubleOut: true })
    const at40 = [T(20), T(20), T(20), T(20), S(20), S(1)].reduce(
      (e, dart, n) => (n === 2 ? dartsRemoved(addDart(e, dart, 'board')) : addDart(e, dart, 'board')),
      before,
    )
    const cue = cueBetween(dartsRemoved(at40), addDart(dartsRemoved(at40), T(20), 'board'))
    expect(cue).toMatchObject({ kind: 'dart', story: { feedback: 'bad', chain: [] }, next: null })
  })

  it('needs no double when playing straight out', () => {
    expect(play(straight, ...to40, open(S(20), S(20))).finished).toBe(true)
    expect(play(straight, ...to40, open(S(20), S(19))).view.remaining['ann']).toBe(1)
    expect(play(straight, ...to40, open(T(20))).view.bust).toBe('ann')
  })

  it('has no round limit', () => {
    const many = Array.from({ length: 400 }, () => turn(miss, miss, miss))
    const state = play(double, ...many)
    expect(state.finished).toBe(false)
    expect(state.current).toMatchObject({ player: 'ann', round: 201 })
  })

  it('only accepts the known start scores', () => {
    expect(cleanX01Setup({ start: 701, doubleOut: false })).toEqual({ start: 701, doubleOut: false })
    expect(cleanX01Setup({ start: 42 })).toEqual({ start: 501, doubleOut: true })
    expect(cleanX01Setup(null)).toEqual({ start: 501, doubleOut: true })
  })
})

describe('X01 checkouts', () => {
  const route = (remaining: number, darts: number, doubleOut = true): string | null =>
    checkout(remaining, darts, doubleOut)?.map((dart) => dart.name).join(' ') ?? null

  it('finishes on a double, the handiest one', () => {
    expect(route(40, 3)).toBe('D20')
    expect(route(32, 1)).toBe('D16')
    expect(route(60, 3)).toBe('S20 D20')
    expect(route(100, 3)).toBe('T20 D20')
    expect(route(80, 2)).toBe('T16 D16')
  })

  it('uses the bullseye only when nothing else will do', () => {
    expect(route(50, 1)).toBe('Bull')
    expect(route(50, 2)).toBe('S10 D20')
    expect(route(170, 3)).toBe('T20 T20 Bull')
    expect(route(167, 3)).toBe('T20 T19 Bull')
  })

  it('knows what cannot be finished', () => {
    for (const bogey of [169, 168, 166, 165, 163, 162, 159, 171, 181]) expect(route(bogey, 3), String(bogey)).toBeNull()
    expect(route(1, 3)).toBeNull()
    expect(route(100, 1)).toBeNull()
    expect(route(111, 2)).toBeNull()
    expect(route(0, 3)).toBeNull()
  })

  it('always adds up, ends on a double and fits the darts left', () => {
    for (let remaining = 2; remaining <= 170; remaining++) {
      for (const darts of [1, 2, 3]) {
        const found = checkout(remaining, darts, true)
        if (!found) continue
        expect(found.length).toBeLessThanOrEqual(darts)
        expect(found.reduce((sum, dart) => sum + dart.number! * dart.multiplier, 0), String(remaining)).toBe(remaining)
        expect(found.at(-1)!.multiplier).toBe(2)
      }
    }
    // Everything up to 158 can be finished with three darts.
    for (let remaining = 2; remaining <= 158; remaining++) expect(route(remaining, 3), String(remaining)).not.toBeNull()
  })

  it('takes any last dart when playing straight out', () => {
    expect(route(20, 1, false)).toBe('S20')
    expect(route(57, 1, false)).toBe('T19')
    expect(route(1, 3, false)).toBe('S1')
    expect(route(180, 3, false)).toBe('T20 T20 T20')
    expect(route(179, 3, false)).toBeNull()
  })

  it('is shown for the player at the board, with the darts they have left', () => {
    const names = (turns: Turn[]) =>
      x01.evaluate({ start: 301, doubleOut: true }, ['ann'], turns).view.checkout?.map((dart) => dart.name) ?? null
    expect(names([])).toBeNull()
    // 121 to go with three darts; after a triple 20, 61 with two.
    expect(names([turn(T(20), T(20), T(20))])).toEqual(['T20', '25', 'D18'])
    expect(names([turn(T(20), T(20), T(20)), open(T(20))])).toEqual(['25', 'D18'])
    // 61 with one dart left cannot be done: no suggestion.
    expect(names([turn(T(20), T(20), T(20)), open(T(20), miss)])).toBeNull()
    expect(names([turn(T(20), T(20), T(20)), turn(T(20), S(20), S(1))])).toEqual(['D20'])
    expect(names([turn(T(20), T(20), T(20)), turn(T(20), S(1)), open(S(10), S(10))])).toEqual(['D20'])
  })
})

describe('Around the Clock', () => {
  const play = (...turns: Turn[]) => aroundTheClock.evaluate(null, ['ann', 'bob'], turns)

  it('moves on one number for any ring of the target', () => {
    const state = play(turn(S(1), T(2), D(3)), turn(S(5), S(1), miss))
    expect(state.view.targets).toEqual({ ann: 4, bob: 2 })
    expect(state.feedback).toEqual(['good', 'good', 'good', 'neutral', 'good', 'bad'])
  })

  it('does not count a number out of order', () => {
    expect(play(turn(S(2), S(1), S(1))).view.targets['ann']).toBe(2)
  })

  it('is won by the first to hit the 20', () => {
    const round = (from: number): Turn[] => [turn(S(from), S(from + 1), S(from + 2)), turn(miss)]
    const turns = [1, 4, 7, 10, 13, 16].flatMap(round)
    const state = play(...turns, open(S(19), S(20)))
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['ann'], ['bob']])
    expect(state.view.targets['ann']).toBe(21)
  })
})

describe('free play', () => {
  const start = (names = ['ann', 'bob']): Party => startFreePlay(people(...names), 'x01', { start: 301, doubleOut: true })

  it('starts straight at the board, also alone', () => {
    const solo = start(['ann'])
    expect(solo.stage).toBe('playing')
    expect(activeState(solo)!.current).toMatchObject({ player: 'ann' })
    const next = dartsRemoved(addDart(solo, T(20), 'board'))
    expect(activeState(next)!.current).toMatchObject({ player: 'ann', round: 2 })
  })

  it('refuses nobody, too many players and unknown games', () => {
    expect(() => startFreePlay([], 'x01', { start: 301, doubleOut: true })).toThrow()
    expect(() => startFreePlay(people('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'), 'aroundTheClock', null)).toThrow()
    expect(() => startFreePlay(people('ann'), 'nope', null)).toThrow()
  })

  it('does not move on to a draw or a podium', () => {
    const party = start()
    expect(advance(party, seededRandom(1))).toBe(party)
  })

  it('plays again with the next player starting', () => {
    const played = addDart(start(['ann', 'bob', 'cy']), T(20), 'board')
    const again = playAgain(played)
    expect(again.games).toHaveLength(1)
    expect(again.games[0]).toMatchObject({ gameId: 'x01', order: ['bob', 'cy', 'ann'], turns: [] })
    // Nothing of the old game replays.
    expect(cueBetween(played, again)).toBeNull()
  })

  it('animates like any other game', () => {
    const before = start()
    const cue = cueBetween(before, addDart(before, T(20), 'board'))
    expect(cue).toMatchObject({ kind: 'dart', story: { feedback: 'great' } })
    if (cue?.kind === 'dart') expect(cue.story.chain.map((beat) => beat.kind)).toEqual(['scored', 'spectacle'])
  })
})

describe('free play in the session', () => {
  function memory() {
    const files = new Map<string, string>()
    const store: Store = {
      load: (name) => (files.has(name) ? JSON.parse(files.get(name)!) : null),
      save: (name, data) => void files.set(name, JSON.stringify(data)),
      remove: (name) => void files.delete(name),
    }
    return { store, files }
  }
  const begin = (store: Store) => new PartySession(store, seededRandom(1))

  it('starts with cleaned options and resumes after a restart', () => {
    const { store } = memory()
    const s = begin(store)
    s.command({ type: 'startFreePlay', players: people('ann'), game: 'x01', options: { start: 701, doubleOut: 'yes' } })
    expect(s.current?.games[0]?.setup).toEqual({ start: 701, doubleOut: true })
    s.command({ type: 'addDart', dart: { number: 20, multiplier: 3 } })
    const resumed = begin(store)
    expect(resumed.current?.freePlay).toBe(true)
    expect(activeState(resumed.current!)!.view.remaining).toEqual({ ann: 641 })
  })

  it('only starts free-play games, and not during a party', () => {
    const { store } = memory()
    const s = begin(store)
    s.command({ type: 'startFreePlay', players: people('ann'), game: 'race' })
    expect(s.current).toBeNull()
    s.command({ type: 'startFreePlay', players: people('ann'), game: 'aroundTheClock' })
    s.command({ type: 'startFreePlay', players: people('bob'), game: 'x01' })
    expect(s.current?.games[0]?.gameId).toBe('aroundTheClock')
  })

  it('ends without a result in the history', () => {
    const { store, files } = memory()
    const s = begin(store)
    s.command({ type: 'startFreePlay', players: people('ann'), game: 'aroundTheClock' })
    s.command({ type: 'finish' })
    expect(s.current).toBeNull()
    expect(s.history).toEqual([])
    expect(files.has('party')).toBe(false)
  })
})
