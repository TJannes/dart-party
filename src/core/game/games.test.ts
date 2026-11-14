import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss, neighbour } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom } from '../random'
import { landGrab } from './landGrab'
import { piggyBank } from './piggyBank'
import { drawableGames } from './registry'
import { archeryPoints, robinHood } from './robinHood'
import { spotlight, spotlightWorth } from './spotlight'
import type { Turn } from './types'

const players = ['ann', 'bob']
const turn = (...darts: Dart[]): Turn => ({
  darts: darts.map((dart) => ({ dart, by: 'board' })),
  done: true,
})
const S = (n: number) => manualDart(n, 1)
const D = (n: number) => manualDart(n, 2)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()

/** A dart as Autodarts would report it, with a bed and a position. */
const seen = (bed: string, multiplier: 1 | 2 | 3, radius: number): Dart => ({
  name: 'x',
  number: 20,
  multiplier,
  bed,
  miss: false,
  position: { x: 0, y: radius },
})

describe('every drawable game', () => {
  it('starts with the first player and ends after its last round', () => {
    for (const rules of drawableGames) {
      const setup = rules.setup(players, seededRandom(1))
      const start = rules.evaluate(setup, players, [])
      expect(start.current, rules.id).toEqual({ player: 'ann', round: 1, dartsLeft: rules.dartsPerTurn })
      expect(start.finished, rules.id).toBe(false)

      const all = Array.from({ length: rules.maxRounds * players.length }, () => turn(miss))
      const end = rules.evaluate(setup, players, all)
      expect(end.finished, rules.id).toBe(true)
      expect(end.ranking.flat().sort(), rules.id).toEqual(['ann', 'bob'])
      expect(end.feedback, rules.id).toHaveLength(all.length)
      expect(rules.evaluate(setup, players, all.slice(0, -1)).finished, rules.id).toBe(false)
    }
  })

  it('has a setup that survives being saved', () => {
    for (const rules of drawableGames) {
      const setup = rules.setup(players, seededRandom(2))
      expect(JSON.parse(JSON.stringify(setup)), rules.id).toEqual(setup)
    }
  })
})

describe('Robin Hood', () => {
  it('scores by distance from the centre only', () => {
    expect(archeryPoints(manualDart(25, 2))).toBe(6)
    expect(archeryPoints(manualDart(25, 1))).toBe(5)
    expect(archeryPoints(manualDart(20, 1, true))).toBe(4)
    expect(archeryPoints(S(1))).toBe(3)
    expect(archeryPoints(T(20))).toBe(3)
    expect(archeryPoints(D(20))).toBe(3)
    expect(archeryPoints(miss)).toBe(0)
  })

  it('goes by the bed, not by the measured position', () => {
    // Just outside the triple ring by position, but reported as inner single.
    expect(archeryPoints(seen('SingleInner', 1, 0.6))).toBe(4)
    expect(archeryPoints(seen('SingleOuter', 1, 0.5))).toBe(3)
  })

  it('falls back on the position for a bed it does not know', () => {
    expect(archeryPoints(seen('Mystery', 1, 0.3))).toBe(4)
    expect(archeryPoints(seen('Mystery', 1, 0.8))).toBe(3)
  })

  it('adds up and ranks by total', () => {
    const state = robinHood.evaluate(null, players, [
      turn(manualDart(25, 2), manualDart(5, 1, true), miss),
      turn(T(20), S(20), manualDart(25, 1)),
    ])
    expect(state.view.scores).toEqual({ ann: 10, bob: 11 })
    expect(state.ranking).toEqual([['bob'], ['ann']])
    expect(state.feedback).toEqual(['great', 'good', 'bad', 'neutral', 'neutral', 'great'])
  })
})

describe('Spotlight', () => {
  const setup = { targets: [20, 3, 6, 11, 8, 16] }

  it('draws six different targets', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { targets } = spotlight.setup(players, seededRandom(seed))
      expect(new Set(targets).size).toBe(6)
    }
  })

  it('is worth 3 on the target, 2 beside it, 1 beside those', () => {
    expect(spotlightWorth(20)).toEqual({ 20: 3, 1: 2, 5: 2, 18: 1, 12: 1 })
  })

  it('counts doubles and triples as one hit and the bull as nothing', () => {
    const state = spotlight.evaluate(setup, players, [turn(T(20), D(1), manualDart(25, 2))])
    expect(state.view.scores['ann']).toBe(5)
  })

  it('gives everyone the same target in a round, and a new one the next', () => {
    const state = spotlight.evaluate(setup, players, [
      turn(S(20)),
      turn(S(20)),
      turn(S(20), S(3)),
      turn(S(neighbour(3, 2))),
    ])
    expect(state.view.scores).toEqual({ ann: 6, bob: 4 })
    expect(state.view.target).toBe(6)
    expect(spotlight.evaluate(setup, players, []).view.target).toBe(20)
  })

  it('keeps showing the last target when the game is over', () => {
    const all = Array.from({ length: 12 }, () => turn(miss))
    expect(spotlight.evaluate(setup, players, all).view.target).toBe(16)
  })
})

describe('Piggy Bank', () => {
  it('adds the ordinary value of every dart', () => {
    const state = piggyBank.evaluate(null, players, [turn(T(20), D(5), manualDart(25, 2))])
    expect(state.view.scores['ann']).toBe(120)
  })

  it('loses half, rounded down, on a dart off the board', () => {
    const state = piggyBank.evaluate(null, players, [turn(S(20), S(5), miss), turn(miss)])
    // 25 in the pig, 12 lost.
    expect(state.view.scores).toEqual({ ann: 13, bob: 0 })
    expect(state.view.breaks).toEqual({ ann: 1, bob: 1 })
  })

  it('takes the darts in order: saving after a break is safe', () => {
    const state = piggyBank.evaluate(null, players, [turn(S(20), miss, S(20))])
    expect(state.view.scores['ann']).toBe(30)
  })

  it('counts a bounce-out as off the board', () => {
    const bounced: Dart = { ...S(20), miss: true, number: null, multiplier: 0 }
    expect(piggyBank.evaluate(null, players, [turn(S(20), bounced)]).view.scores['ann']).toBe(10)
  })
})

describe('Land Grab', () => {
  const play = (...turns: Turn[]) => landGrab.evaluate(null, players, turns)

  it('takes a free plot and fortifies your own', () => {
    const { view } = play(turn(S(20), S(20), S(20)))
    expect(view.plots[20]).toEqual({ owner: 'ann', fortified: true, damage: 0 })
    expect(view.scores).toEqual({ ann: 1, bob: 0 })
    expect(view.fortified['ann']).toBe(1)
  })

  it('takes a plain plot on the second hit', () => {
    const one = play(turn(S(20)), turn(S(20)))
    expect(one.view.plots[20]).toEqual({ owner: 'ann', fortified: false, damage: 1 })
    const two = play(turn(S(20)), turn(S(20), S(20)))
    expect(two.view.plots[20]).toEqual({ owner: 'bob', fortified: false, damage: 0 })
  })

  it('takes a fortified plot on the third hit', () => {
    const two = play(turn(S(20), S(20)), turn(S(20), S(20)))
    expect(two.view.plots[20]!.owner).toBe('ann')
    const three = play(turn(S(20), S(20)), turn(S(20), S(20), S(20)))
    expect(three.view.plots[20]!.owner).toBe('bob')
  })

  it('adds up the hits of different attackers; the last one takes it', () => {
    const three = ['ann', 'bob', 'cy']
    const state = landGrab.evaluate(null, three, [turn(S(20)), turn(S(20)), turn(S(20))])
    expect(state.view.plots[20]!.owner).toBe('cy')
  })

  it('counts a double as two hits and a triple as three', () => {
    expect(play(turn(D(20))).view.plots[20]).toEqual({ owner: 'ann', fortified: true, damage: 0 })
    expect(play(turn(S(20)), turn(D(20))).view.plots[20]!.owner).toBe('bob')
    // Two hits knock it down, the third fortifies it for the new owner.
    expect(play(turn(S(20)), turn(T(20))).view.plots[20]).toEqual({
      owner: 'bob',
      fortified: true,
      damage: 0,
    })
  })

  it('does nothing on the bull or a miss', () => {
    const { view, feedback } = play(turn(manualDart(25, 2), miss))
    expect(view.scores).toEqual({ ann: 0, bob: 0 })
    expect(feedback).toEqual(['neutral', 'bad'])
  })

  it('ranks by plots, then by fortified plots', () => {
    const state = play(turn(S(1), S(2), S(3)), turn(D(4), D(5), S(6)), turn(S(7)))
    expect(state.view.scores).toEqual({ ann: 4, bob: 3 })
    expect(state.ranking).toEqual([['ann'], ['bob']])
    const level = play(turn(S(1), S(2)), turn(D(4), S(5)))
    expect(level.ranking).toEqual([['bob'], ['ann']])
    const tied = play(turn(S(1)), turn(S(4)))
    expect(tied.ranking).toEqual([['ann', 'bob']])
  })
})
