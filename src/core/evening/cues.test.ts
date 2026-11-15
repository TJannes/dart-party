import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { decider } from '../game/decider'
import { higherOrLower } from '../game/higherOrLower'
import { piggyBank } from '../game/piggyBank'
import { spotlight } from '../game/spotlight'
import { cueBetween, featOf, storiesOf, type Cue } from './cues'
import {
  addDart,
  correctDart,
  dartsRemoved,
  nextPlayer,
  removeLastDart,
  type Evening,
  type Player,
} from './evening'

const people = (...names: string[]): Player[] => names.map((name) => ({ id: name, name, avatar: 'fox' }))
const S = (n: number) => manualDart(n, 1)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()

/** An evening in the middle of one game, with a hand-made setup. */
function playing(gameId: string, setup: unknown, names = ['ann', 'bob', 'cy']): Evening {
  return {
    players: people(...names),
    gamesPlanned: 1,
    enabledGames: [gameId],
    stage: 'playing',
    games: [{ gameId, order: names, setup, turns: [] }],
    deciders: [],
  }
}

const throwAll = (evening: Evening, ...darts: Dart[]): Evening =>
  darts.reduce((e, dart) => addDart(e, dart, 'board'), evening)

const kinds = (cue: Cue | null): string[] =>
  cue?.kind === 'dart' ? cue.story.chain.map((beat) => beat.kind) : []

const lastOne = { segments: { ann: [20], bob: [1], cy: [18] } }

describe('moments from the rules', () => {
  it('reports an attack, the lives lost and the knockout, in that order', () => {
    const before = playing('lastOneStanding', lastOne)
    const after = addDart(before, T(1), 'board')
    const cue = cueBetween(before, after)
    expect(cue?.kind).toBe('dart')
    expect(kinds(cue)).toEqual(['attacked', 'lifeLost', 'knockedOut'])
    if (cue?.kind !== 'dart') return
    expect(cue.story.chain[0]).toEqual({ kind: 'attacked', by: 'ann', victim: 'bob', amount: 3 })
    expect(cue.story.chain[1]).toEqual({ kind: 'lifeLost', player: 'bob', amount: 3, left: 0 })
  })

  it('reports no attack when you hit your own segment', () => {
    const before = playing('lastOneStanding', lastOne)
    expect(kinds(cueBetween(before, addDart(before, S(20), 'board')))).toEqual(['lifeLost'])
  })

  it('ends the chain with the win when the dart ends the game', () => {
    const before = playing('lastOneStanding', lastOne, ['ann', 'bob'])
    const cue = cueBetween(before, addDart(before, T(1), 'board'))
    expect(kinds(cue)).toEqual(['attacked', 'lifeLost', 'knockedOut', 'won'])
    if (cue?.kind === 'dart') expect(cue.story.chain.at(-1)).toEqual({ kind: 'won', players: ['ann'] })
  })

  it('reports what the pig gains and what it loses', () => {
    const state = piggyBank.evaluate(null, ['ann'], [{ darts: [T(20), miss].map((dart) => ({ dart, by: 'board' as const })), done: false }])
    expect(state.played.map((p) => p.moments)).toEqual([
      [{ kind: 'scored', player: 'ann', amount: 60 }],
      [{ kind: 'lost', player: 'ann', amount: 30 }],
    ])
  })

  it('keeps one entry per dart beside the feedback, in every game', () => {
    const turns = [{ darts: [S(20), miss, T(5)].map((dart) => ({ dart, by: 'board' as const })), done: true }]
    for (const rules of [piggyBank, decider, spotlight, higherOrLower]) {
      const state = rules.evaluate(rules.setup(['ann', 'bob'], () => 0.3) as never, ['ann', 'bob'], turns)
      expect(state.played, rules.id).toHaveLength(state.feedback.length)
    }
  })
})

describe('spectacular darts', () => {
  const plain = { feats: ['bullseye', 'triple20', 'oneEighty'] as const, dartsPerTurn: 3 }
  const none = { dartsPerTurn: 3 }

  it('knows the feats of a game that scores by value', () => {
    expect(featOf(plain, [T(20)])).toBe('triple20')
    expect(featOf(plain, [manualDart(25, 2)])).toBe('bullseye')
    expect(featOf(plain, [T(20), T(20), T(20)])).toBe('oneEighty')
    expect(featOf(plain, [S(20)])).toBeNull()
  })

  it('finds three in one segment and three misses in every game', () => {
    expect(featOf(none, [S(7), T(7), S(7)])).toBe('hatTrick')
    expect(featOf(none, [miss, miss, miss])).toBe('threeMisses')
    expect(featOf(none, [miss, miss])).toBeNull()
    expect(featOf(none, [T(20)])).toBeNull()
  })

  it('calls a win taken on the last dart a photo finish', () => {
    // A deciding round: ann sets 20, bob needs more with his last dart.
    let evening: Evening = {
      ...playing('decider', null, ['ann', 'bob']),
      stage: 'decider',
      games: [],
      deciders: [{ gameId: 'decider', order: ['ann', 'bob'], setup: null, turns: [] }],
    }
    evening = dartsRemoved(throwAll(evening, S(20), miss, miss))
    const before = throwAll(evening, S(1), S(1))
    const cue = cueBetween(before, addDart(before, S(19), 'board'))
    expect(kinds(cue)).toEqual(['scored', 'spectacle', 'won'])
    if (cue?.kind === 'dart') expect(cue.story.chain[1]).toMatchObject({ what: 'lastDart', player: 'bob' })

    // Already ahead before the last dart: no photo finish.
    const ahead = throwAll(evening, S(20), S(5))
    expect(kinds(cueBetween(ahead, addDart(ahead, S(1), 'board')))).toEqual(['scored', 'won'])
  })

  it('drops a general spectacle when someone is knocked out', () => {
    const before = throwAll(playing('lastOneStanding', lastOne), S(1), S(1))
    expect(kinds(cueBetween(before, addDart(before, S(1), 'board')))).toEqual(['attacked', 'lifeLost', 'knockedOut'])
  })
})

describe('what plays when', () => {
  const start = playing('piggyBank', null)

  it('plays nothing on the first look or without an evening', () => {
    expect(cueBetween(undefined, start)).toBeNull()
    expect(cueBetween(null, start)).toBeNull()
    expect(cueBetween(start, null)).toBeNull()
    expect(cueBetween(start, start)).toBeNull()
  })

  it('plays nothing when a dart is taken back', () => {
    const one = addDart(start, S(20), 'board')
    expect(cueBetween(one, removeLastDart(one))).toBeNull()
  })

  it('plays nothing across games or stages', () => {
    const one = addDart(start, S(20), 'board')
    expect(cueBetween({ ...start, stage: 'rules' }, one)).toBeNull()
    const nextGame: Evening = { ...one, games: [...one.games, { gameId: 'piggyBank', order: ['ann', 'bob', 'cy'], setup: null, turns: [] }] }
    expect(cueBetween(one, addDart(nextGame, S(20), 'board'))).toBeNull()
  })

  it('plays the new outcome of a corrected dart, also an earlier one', () => {
    const three = throwAll(start, S(20), S(5), S(1))
    const cue = cueBetween(three, correctDart(three, 0, 1, miss))
    expect(cue?.kind).toBe('dart')
    if (cue?.kind !== 'dart') return
    expect(cue.story.index).toBe(1)
    expect(cue.story.feedback).toBe('bad')
    expect(cue.story.chain).toEqual([{ kind: 'lost', player: 'ann', amount: 10 }])
  })

  it('announces the next player when only the turn passes', () => {
    const one = addDart(start, S(20), 'board')
    expect(cueBetween(one, dartsRemoved(one))).toEqual({ kind: 'turn', game: 'g0', player: 'bob' })
    expect(cueBetween(start, nextPlayer(start))).toEqual({ kind: 'turn', game: 'g0', player: 'bob' })
  })

  it('names the next player on a dart that ends the turn by rule', () => {
    const before = playing('lastOneStanding', lastOne)
    const cue = cueBetween(before, addDart(before, T(20), 'board'))
    expect(kinds(cue)).toEqual(['lifeLost', 'knockedOut'])
    expect(cue).toMatchObject({ next: 'bob' })
  })

  it('gives every dart of a game a story', () => {
    const record = throwAll(start, S(20), miss).games[0]!
    expect(storiesOf(record, 'g0').map((story) => story.feedback)).toEqual(['good', 'bad'])
  })
})
