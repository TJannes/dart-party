import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss, neighbour, placedDart, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom } from '../random'
import { landGrab } from './landGrab'
import { minefield, MINEFIELD_CONTENTS, type Hidden } from './minefield'
import { piggyBank } from './piggyBank'
import { drawableGames } from './registry'
import { MAX_RAISES, openingsEach, raiseTheBar } from './raiseTheBar'
import { archeryPoints, robinHood } from './robinHood'
import { sniper } from './sniper'
import { spotlight, spotlightWorth } from './spotlight'
import { rankingSettled, roundLimit, type Turn } from './types'

const players = ['ann', 'bob']
const KNOCKOUT = ['lastOneStanding', 'higherOrLower', 'timeBomb', 'raiseTheBar']
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
      expect(start.current, rules.id).toEqual({ player: 'ann', round: 1, dartsLeft: rules.dartsPerTurn, turn: 0 })
      expect(start.finished, rules.id).toBe(false)

      const all = Array.from({ length: rules.maxRounds * players.length }, () => turn(miss))
      const end = rules.evaluate(setup, players, all)
      expect(end.finished, rules.id).toBe(true)
      expect(end.ranking.flat().sort(), rules.id).toEqual(['ann', 'bob'])
      expect(end.throwers.length, rules.id).toBeLessThanOrEqual(all.length)
      expect(end.feedback, rules.id).toHaveLength(end.throwers.length)
      // Some games can be over before the last round when nobody scores.
      if (!KNOCKOUT.includes(rules.id)) {
        expect(end.throwers, rules.id).toHaveLength(all.length)
        expect(rules.evaluate(setup, players, all.slice(0, -1)).finished, rules.id).toBe(false)
      }
    }
  })

  it('ends Race and Time Bomb sooner with more players', () => {
    const limits = (id: string) =>
      [2, 3, 4, 5, 6, 7, 8].map((n) => roundLimit(drawableGames.find((rules) => rules.id === id)!, n))
    expect(limits('race')).toEqual([10, 10, 10, 8, 7, 6, 5])
    expect(limits('timeBomb')).toEqual([10, 10, 10, 10, 8, 7, 6])
    expect(limits('robinHood')).toEqual([6, 6, 6, 6, 6, 6, 6])

    const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    for (const id of ['race', 'timeBomb']) {
      const rules = drawableGames.find((game) => game.id === id)!
      const setup = rules.setup(eight, seededRandom(1))
      const all = Array.from({ length: roundLimit(rules, 8) * 8 }, () => turn(miss))
      expect(rules.evaluate(setup, eight, all.slice(0, -1)).finished, id).toBe(false)
      expect(rules.evaluate(setup, eight, all).finished, id).toBe(true)
    }
  })

  it('has a setup that survives being saved', () => {
    for (const rules of drawableGames) {
      const setup = rules.setup(players, seededRandom(2))
      expect(JSON.parse(JSON.stringify(setup)), rules.id).toEqual(setup)
    }
  })
})

describe('the end of the last turn', () => {
  const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
  /** Five rounds in which only ann scored, with this dart each turn. */
  const fiveRounds = (dart: Dart) => Array.from({ length: 5 }, () => [turn(dart), turn(miss)]).flat()

  it('sees whether anyone can still pass or catch up with anyone', () => {
    const scores: Record<string, number> = { ann: 10, bob: 5, cy: 5 }
    const fixed = (p: string) => [scores[p]!, scores[p]!] as const
    expect(rankingSettled(['ann', 'bob'], (p) => scores[p]!, (p) => (p === 'bob' ? [5, 9] : fixed(p)))).toBe(true)
    expect(rankingSettled(['ann', 'bob'], (p) => scores[p]!, (p) => (p === 'bob' ? [5, 10] : fixed(p)))).toBe(false)
    expect(rankingSettled(['ann', 'bob'], (p) => scores[p]!, (p) => (p === 'ann' ? [5, 10] : fixed(p)))).toBe(false)
    // A tie can be broken.
    expect(rankingSettled(['bob', 'cy'], (p) => scores[p]!, (p) => (p === 'cy' ? [5, 6] : fixed(p)))).toBe(false)
    expect(rankingSettled(['ann', 'bob', 'cy'], (p) => scores[p]!, fixed)).toBe(true)
  })

  it('ends the game once the last thrower cannot change the standings', () => {
    // Ann has 30; bob can reach no more than 3 + 12 with the darts left.
    const settled = robinHood.evaluate(null, players, [...fiveRounds(manualDart(25, 2)), turn(miss), open(S(1))])
    expect(settled.finished).toBe(true)
    expect(settled.current).toBeNull()
    // Ann has 15: bob can still draw level.
    const close = robinHood.evaluate(null, players, [...fiveRounds(S(1)), turn(miss), open(S(1))])
    expect(close.finished).toBe(false)
    expect(close.current).toMatchObject({ player: 'bob', dartsLeft: 2 })
  })

  it('keeps going while the last thrower could still fall behind', () => {
    // Bob leads ann by one, but breaking his pig could drop him behind her.
    const before = [turn(S(5)), turn(S(6))]
    expect(piggyBank.evaluate(null, players, [...Array(5).fill(before).flat(), turn(S(5)), open(S(6))]).finished).toBe(false)
    // By far ahead, nothing he throws can cost him the lead.
    const far = [turn(S(1)), turn(D(20))]
    expect(piggyBank.evaluate(null, players, [...Array(5).fill(far).flat(), turn(S(1)), open(D(20))]).finished).toBe(true)
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

describe('moments of the themed games', () => {
  const moments = (state: { played: { moments: unknown[] }[] }) => state.played.map((p) => p.moments)

  it('Spotlight: reports a turn of three darts that brought nothing', () => {
    const setup = { targets: [20, 3, 6, 11, 8, 16] }
    const blank = spotlight.evaluate(setup, players, [turn(S(7), miss, S(8))])
    expect(moments(blank)).toEqual([[], [], [{ kind: 'blank', player: 'ann' }]])
    expect(moments(spotlight.evaluate(setup, players, [turn(S(7), S(20), S(8))])).at(-1)).toEqual([])
    // Two darts and a takeout is not a blank turn.
    expect(moments(spotlight.evaluate(setup, players, [turn(S(7), S(8))])).flat()).toEqual([])
  })

  it('Land Grab: reports the second wall', () => {
    expect(moments(landGrab.evaluate(null, players, [turn(D(20))]))).toEqual([
      [{ kind: 'scored', player: 'ann', amount: 1 }, { kind: 'fortified', player: 'ann' }],
    ])
  })

  it('Sniper: measures every placed dart and names the closest three at the end of a round', () => {
    const setup = { targets: [{ x: 0, y: 0 }] }
    const at = (x: number) => placedDart(x, 0)
    const state = sniper.evaluate(setup, players, [turn(at(0.5), miss, at(0.2)), turn(at(0.1), at(0.3), at(0.4))])
    expect(state.played[0]!.moments).toEqual([{ kind: 'measured', player: 'ann', mm: 85, target: { x: 0, y: 0 } }])
    expect(state.played[1]!.moments).toEqual([])
    expect(state.played.at(-1)!.moments.at(-1)).toEqual({
      kind: 'roundResult',
      places: [
        { player: 'bob', at: { x: 0.1, y: 0 } },
        { player: 'ann', at: { x: 0.2, y: 0 } },
      ],
    })
    expect(state.played.slice(0, -1).flatMap((p) => p.moments).some((m) => m.kind === 'roundResult')).toBe(false)
  })

  it('Minefield: reports what was dug up, and leaves the digger of a bomb scorched for the turn', () => {
    const under: Record<number, Hidden> = {}
    RING.forEach((segment) => (under[segment] = 'empty'))
    Object.assign(under, { 20: 'chest', 18: 'bomb', 4: 'coin' })
    const play = (...turns: Turn[]) => minefield.evaluate({ under }, players, turns)
    const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })
    const state = play(open(S(20), S(18), S(18)))
    expect(moments(state)).toEqual([
      [{ kind: 'dug', player: 'ann', segment: 20, found: 'chest' }, { kind: 'scored', player: 'ann', amount: 5 }],
      [
        { kind: 'dug', player: 'ann', segment: 18, found: 'bomb' },
        { kind: 'exploded', player: 'ann' },
        { kind: 'lost', player: 'ann', amount: 2 },
      ],
      [],
    ])
    expect(state.view.scorched).toEqual(['ann'])
    expect(play(turn(S(18)), open(S(7))).view.scorched).toEqual(['ann'])
    expect(play(turn(S(18)), turn(S(7))).view.scorched).toEqual([])
    expect(play(turn(S(18)), turn(S(7)), open(S(7))).view.scorched).toEqual([])
  })

  it('Raise the Bar: reports the jump, over the bar or not', () => {
    const three = ['ann', 'bob', 'cy']
    const over = raiseTheBar.evaluate(null, three, [turn(S(20)), turn(S(10), S(5), S(10))])
    expect(over.played.at(-1)!.moments).toEqual([{ kind: 'jump', player: 'bob', holder: 'ann', cleared: true }])
    const under = raiseTheBar.evaluate(null, three, [turn(S(20)), turn(S(10), S(5), S(5))])
    expect(under.played.at(-1)!.moments).toEqual([
      { kind: 'jump', player: 'bob', holder: 'ann', cleared: false },
      { kind: 'scored', player: 'ann', amount: 1 },
    ])
  })
})

describe('Piggy Bank', () => {
  it('pays three times in the double ring and only once in the triple ring', () => {
    const state = piggyBank.evaluate(null, players, [turn(T(20), D(5), S(7))])
    // 20 + 15 + 7.
    expect(state.view.scores['ann']).toBe(42)
    expect(piggyBank.evaluate(null, players, [turn(D(20))]).view.scores['ann']).toBe(60)
  })

  it('leaves the bull at its ordinary 25 and 50', () => {
    const state = piggyBank.evaluate(null, players, [turn(manualDart(25, 1), manualDart(25, 2))])
    expect(state.view.scores['ann']).toBe(75)
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

describe('Sniper', () => {
  // The cross dead centre in round one, at the top of the board in round two.
  const setup = { targets: [{ x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }] }
  const three = ['ann', 'bob', 'cy']
  const at = (x: number, y: number) => placedDart(x, y)
  const play = (...turns: Turn[]) => sniper.evaluate(setup, three, turns)

  it('puts every cross inside the double ring', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { targets } = sniper.setup(three, seededRandom(seed))
      expect(targets).toHaveLength(5)
      for (const t of targets) expect(Math.hypot(t.x, t.y)).toBeLessThanOrEqual(0.95)
    }
  })

  it('counts only your closest dart, in millimetres from the cross', () => {
    const { view } = play({ darts: [at(0.5, 0), at(0.1, 0), at(0.3, 0)].map((dart) => ({ dart, by: 'board' })), done: false })
    expect(view.closest['ann']!.mm).toBeCloseTo(17)
    expect(view.closest['ann']!.at).toEqual({ x: 0.1, y: 0 })
  })

  it('pays 3, 2 and 1 once everyone has thrown, not before', () => {
    const early = play(turn(at(0.1, 0)), turn(at(0.2, 0)))
    expect(early.view.scores).toEqual({ ann: 0, bob: 0, cy: 0 })
    const done = play(turn(at(0.2, 0)), turn(at(0.1, 0)), turn(at(0.3, 0)))
    expect(done.view.scores).toEqual({ ann: 2, bob: 3, cy: 1 })
    expect(done.view.target).toEqual({ x: 0, y: 0.5 })
    expect(done.view.closest).toEqual({})
  })

  it('gives nothing to a player without a placed dart', () => {
    const state = play(turn(miss, manualDart(20, 3)), turn(at(0.9, 0)), turn(at(0.1, 0)))
    expect(state.view.scores).toEqual({ ann: 0, bob: 2, cy: 3 })
    expect(state.feedback.slice(0, 2)).toEqual(['bad', 'bad'])
  })

  it('counts a dart in the surround by its distance too', () => {
    const state = play(turn(at(1.1, 0)), turn(miss), turn(miss))
    expect(state.view.scores['ann']).toBe(3)
  })

  it('lets players level to the millimetre share the place', () => {
    const state = play(turn(at(0.1, 0)), turn(at(0, 0.1)), turn(at(0.5, 0)))
    expect(state.view.scores).toEqual({ ann: 3, bob: 3, cy: 1 })
  })

  it('tells who took the lead', () => {
    const state = play(turn(at(0.3, 0), at(0.2, 0), at(0.4, 0)), turn(at(0.25, 0), at(0.1, 0)))
    expect(state.feedback).toEqual(['great', 'great', 'neutral', 'good', 'great'])
  })

  /** Four rounds nobody scored in, then the last round. */
  const lastRound = (...turns: Turn[]) => play(...Array.from({ length: 12 }, () => turn(miss)), ...turns)
  const throwing = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })

  it('ends the game as soon as the last darts can change nothing', () => {
    const state = lastRound(turn(at(0.3, 0)), turn(at(0.2, 0)), throwing(at(0.1, 0)))
    expect(state.finished).toBe(true)
    expect(state.view.scores).toEqual({ ann: 1, bob: 2, cy: 3 })
    expect(state.played.at(-1)!.moments.some((m) => m.kind === 'roundResult')).toBe(true)
  })

  it('lets the last player throw on while they can still climb', () => {
    const open = lastRound(turn(at(0.1, 0)), turn(at(0.2, 0)), throwing(at(0.3, 0)))
    expect(open.finished).toBe(false)
    expect(open.current).toMatchObject({ player: 'cy', dartsLeft: 2 })
    const climbed = lastRound(turn(at(0.1, 0)), turn(at(0.2, 0)), throwing(at(0.3, 0), at(0.05, 0)))
    expect(climbed.finished).toBe(true)
    expect(climbed.view.scores).toEqual({ ann: 2, bob: 1, cy: 3 })
  })

  it('also ends when climbing would not change the standings', () => {
    // After four rounds ann has 12, bob 8, cy 4. At best cy ends on 7, behind bob's 9.
    const rounds = Array.from({ length: 4 }, () => [turn(at(0, 0)), turn(at(0.1, 0)), turn(at(0.2, 0))]).flat()
    const state = play(...rounds, turn(at(0, 0)), turn(at(0.1, 0)), throwing(at(0.5, 0)))
    expect(state.finished).toBe(true)
    expect(state.ranking).toEqual([['ann'], ['bob'], ['cy']])
  })

  it('uses the cross of the round the turn is in', () => {
    const state = play(turn(miss), turn(miss), turn(miss), turn(at(0, 0.5)), turn(at(0, 0)), turn(at(0, 0.4)))
    expect(state.view.scores).toEqual({ ann: 3, bob: 1, cy: 2 })
  })
})

describe('Minefield', () => {
  const under: Record<number, Hidden> = {}
  RING.forEach((segment) => (under[segment] = 'empty'))
  Object.assign(under, { 20: 'chest', 1: 'coin', 18: 'bomb', 4: 'coin' })
  const setup = { under }
  const play = (...turns: Turn[]) => minefield.evaluate(setup, players, turns)

  it('hides three chests, five coins and four bombs under the twenty segments', () => {
    for (let seed = 0; seed < 30; seed++) {
      const kinds = Object.values(minefield.setup(players, seededRandom(seed)).under)
      expect(kinds).toHaveLength(20)
      for (const kind of Object.keys(MINEFIELD_CONTENTS) as Hidden[]) {
        expect(kinds.filter((k) => k === kind)).toHaveLength(MINEFIELD_CONTENTS[kind])
      }
    }
  })

  it('gives a treasure to the first who hits it, whatever the ring', () => {
    const state = play(turn(T(20), S(1)), turn(S(20), D(4)))
    expect(state.view.scores).toEqual({ ann: 7, bob: 2 })
    expect(state.view.revealed).toEqual({ 20: 'chest', 1: 'coin', 4: 'coin' })
    expect(state.feedback).toEqual(['great', 'good', 'neutral', 'good'])
  })

  it('halves your points on a bomb, once', () => {
    const state = play(turn(S(20), S(1), S(18)), turn(S(18)))
    // 7 points, 3 lost.
    expect(state.view.scores).toEqual({ ann: 4, bob: 0 })
    expect(state.view.left).toMatchObject({ bomb: 0, chest: 0, coin: 1 })
  })

  it('reveals an empty segment and ignores the bull', () => {
    const state = play(turn(S(5), manualDart(25, 2), miss))
    expect(state.view.revealed).toEqual({ 5: 'empty' })
    expect(state.feedback).toEqual(['neutral', 'neutral', 'bad'])
  })

  it('ends at once when the last treasure is found', () => {
    const small: Record<number, Hidden> = {}
    RING.forEach((segment) => (small[segment] = 'bomb'))
    Object.assign(small, { 20: 'chest', 1: 'coin' })
    const state = minefield.evaluate({ under: small }, players, [turn(S(20)), turn(S(1), S(5))])
    expect(state.finished).toBe(true)
    expect(state.view.scores).toEqual({ ann: 5, bob: 2 })
  })
})

describe('Raise the Bar', () => {
  const three = ['ann', 'bob', 'cy']
  const play = (...turns: Turn[]) => raiseTheBar.evaluate(null, three, turns)
  const open = (...darts: Dart[]): Turn => ({ ...turn(...darts), done: false })

  it('lets everyone open equally often, more often with few players', () => {
    expect([2, 3, 4, 5, 8].map(openingsEach)).toEqual([3, 2, 2, 1, 1])
    expect(play().view).toMatchObject({ opening: 1, openings: 6, holder: null, bar: null, pot: 1 })
  })

  it('makes the opener\'s total the bar', () => {
    const state = play(turn(S(20), S(5), S(1)))
    expect(state.view).toMatchObject({ holder: 'ann', bar: 26, pot: 1 })
    expect(state.current).toMatchObject({ player: 'bob', dartsLeft: 3, turn: 1 })
  })

  it('hands over the bar and grows the pot when you throw more', () => {
    const state = play(turn(S(20)), turn(T(20)), open(S(1)))
    expect(state.view).toMatchObject({ holder: 'bob', bar: 60, pot: 2, thrown: 1 })
    expect(state.view.scores).toEqual({ ann: 0, bob: 0, cy: 0 })
    expect(state.current).toMatchObject({ player: 'cy', dartsLeft: 2 })
  })

  it('gives the pot to the holder when the next player fails, also on an equal total', () => {
    const state = play(turn(S(20)), turn(T(20)), turn(S(20), S(20), S(20)))
    expect(state.view.scores).toEqual({ ann: 0, bob: 2, cy: 0 })
    // The failed attempt is void: the second opener sets a fresh bar.
    expect(state.view).toMatchObject({ holder: null, bar: null, pot: 1, opening: 2 })
    expect(state.current).toMatchObject({ player: 'bob', round: 2 })
  })

  it('settles an attempt on its third dart, without waiting for the takeout', () => {
    const state = play(turn(S(20)), open(S(1), S(1), S(1)))
    expect(state.view.scores['ann']).toBe(1)
    expect(state.current).toMatchObject({ player: 'bob', turn: 2 })
  })

  it('does not settle an attempt that is still being thrown', () => {
    const state = play(turn(S(20)), open(S(1), S(1)))
    expect(state.view).toMatchObject({ holder: 'ann', thrown: 2 })
    expect(state.current).toMatchObject({ player: 'bob', dartsLeft: 1, turn: 1 })
  })

  it('lets the openers take turns: ann, bob, cy, ann, ...', () => {
    const fail = [turn(S(20)), turn(miss)]
    const openers = [0, 1, 2, 3].map((n) => play(...Array(n).fill(fail).flat()).current!.player)
    expect(openers).toEqual(['ann', 'bob', 'cy', 'ann'])
  })

  it('is over after the last opening, the most points first', () => {
    // Every opener throws 20, every challenger misses: six openings.
    const turns = Array(6).fill([turn(S(20)), turn(miss)]).flat()
    const state = play(...turns)
    expect(state.finished).toBe(true)
    expect(state.view.scores).toEqual({ ann: 2, bob: 2, cy: 2 })
    expect(play(...turns.slice(0, -1)).finished).toBe(false)
  })

  it('lets the fifth raise on one bar win the pot at once', () => {
    // ann opens with 1, then every challenger throws one more.
    const raises = [2, 3, 4, 5, 6].map((n) => turn(S(n)))
    const state = play(turn(S(1)), ...raises)
    expect(MAX_RAISES).toBe(5)
    // The fifth raise was cy's (bob, cy, ann, bob, cy): pot 1 + 5.
    expect(state.view.scores).toEqual({ ann: 0, bob: 0, cy: 6 })
    expect(state.view).toMatchObject({ holder: null, bar: null, pot: 1, opening: 2 })
    expect(state.current).toMatchObject({ player: 'bob', round: 2 })
    expect(state.played.at(-1)!.moments).toEqual([
      { kind: 'jump', player: 'cy', holder: 'bob', cleared: true },
      { kind: 'scored', player: 'cy', amount: 6 },
    ])
    expect(play(turn(S(1)), ...raises.slice(0, 4)).view).toMatchObject({ holder: 'bob', pot: 5 })
  })

  it('tells when a dart takes you over the bar, and when the attempt failed', () => {
    expect(play(turn(S(20)), open(S(10), S(11))).feedback).toEqual(['good', 'good', 'great'])
    expect(play(turn(S(20)), turn(S(10), S(5), S(5))).feedback.at(-1)).toBe('bad')
  })
})
