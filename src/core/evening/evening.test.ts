import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import type { RaceSetup } from '../game/race'
import { seededRandom } from '../random'
import {
  activeState,
  addDart,
  advance,
  applyBoardEvent,
  canAdvance,
  correctDart,
  dartsRemoved,
  finalRanking,
  nextPlayer,
  removeLastDart,
  standings,
  startEvening,
  type Evening,
  type Player,
} from './evening'
import { placesOf, pointsForRanking } from './points'

const people = (...names: string[]): Player[] =>
  names.map((name) => ({ id: name, name, avatar: 'fox' }))

const four = people('ann', 'bob', 'cy', 'di')

function begin(players = four, games = 2, seed = 1): Evening {
  const random = seededRandom(seed)
  // Past the draw and the rules card, to the first dart.
  return advance(advance(startEvening(players, games, ['race'], random), random), random)
}

const thrown = (evening: Evening, ...darts: Dart[]): Evening =>
  dartsRemoved(darts.reduce((e, dart) => addDart(e, dart, 'board'), evening))

/** A dart on the first segment of the player who is at the board. */
function ownSegment(evening: Evening, multiplier: 1 | 2 | 3 = 3): Dart {
  const record = evening.games.at(-1)!
  const player = activeState(evening)!.current!.player
  return manualDart((record.setup as RaceSetup).segments[player]![0], multiplier)
}

/** Lets the given player win the Race in progress; the others pass. */
function winRace(evening: Evening, winner: string): Evening {
  let e = evening
  for (let guard = 0; guard < 100 && !activeState(e)!.finished; guard++) {
    if (activeState(e)!.current!.player === winner) {
      e = thrown(e, ownSegment(e), ownSegment(e), ownSegment(e))
    } else {
      e = nextPlayer(e)
    }
  }
  return e
}

describe('points', () => {
  it('gives 4-3-2-1 with four players', () => {
    expect(pointsForRanking([['a'], ['b'], ['c'], ['d']])).toEqual({ a: 4, b: 3, c: 2, d: 1 })
  })

  it('lets tied players share the higher points: 4-4-2-1', () => {
    expect(pointsForRanking([['a', 'b'], ['c'], ['d']])).toEqual({ a: 4, b: 4, c: 2, d: 1 })
    expect(pointsForRanking([['a'], ['b', 'c', 'd']])).toEqual({ a: 4, b: 3, c: 3, d: 3 })
    expect(placesOf([['a', 'b'], ['c'], ['d']])).toEqual({ a: 1, b: 1, c: 3, d: 4 })
  })
})

describe('starting an evening', () => {
  it('needs two to eight players, each once', () => {
    const random = seededRandom(1)
    expect(() => startEvening(people('ann'), 5, ['race'], random)).toThrow()
    expect(() => startEvening(people('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'), 5, ['race'], random)).toThrow()
    expect(() => startEvening(people('ann', 'ann'), 5, ['race'], random)).toThrow()
    expect(() => startEvening(four, 5, [], random)).toThrow()
  })

  it('opens with the draw of the first game, then its rules, then play', () => {
    const random = seededRandom(1)
    let evening = startEvening(four, 5, ['race'], random)
    expect(evening.stage).toBe('draw')
    expect(evening.games).toHaveLength(1)
    expect(evening.games[0]!.gameId).toBe('race')
    expect([...evening.games[0]!.order].sort()).toEqual(['ann', 'bob', 'cy', 'di'])
    evening = advance(evening, random)
    expect(evening.stage).toBe('rules')
    evening = advance(evening, random)
    expect(evening.stage).toBe('playing')
  })

  it('draws the first throwing order', () => {
    const orders = new Set<string>()
    for (let seed = 0; seed < 30; seed++) orders.add(begin(four, 2, seed).games[0]!.order.join())
    expect(orders.size).toBeGreaterThan(5)
  })

  it('takes no darts before play starts', () => {
    const evening = startEvening(four, 5, ['race'], seededRandom(1))
    expect(addDart(evening, manualMiss(), 'board')).toBe(evening)
  })
})

describe('a turn', () => {
  it('takes three darts and passes on when they are pulled', () => {
    let evening = begin()
    const [first, second] = evening.games[0]!.order
    expect(activeState(evening)!.current).toMatchObject({ player: first, dartsLeft: 3 })
    evening = addDart(evening, manualMiss(), 'board')
    evening = addDart(evening, manualMiss(), 'board')
    evening = addDart(evening, manualMiss(), 'board')
    expect(activeState(evening)!.current).toMatchObject({ player: first, dartsLeft: 0 })
    // A fourth dart has nowhere to go.
    expect(addDart(evening, manualMiss(), 'hand')).toBe(evening)
    evening = dartsRemoved(evening)
    expect(activeState(evening)!.current).toMatchObject({ player: second, dartsLeft: 3 })
  })

  it('passes on after a takeout with fewer than three darts', () => {
    const evening = thrown(begin(), manualMiss())
    expect(activeState(evening)!.current!.player).toBe(evening.games[0]!.order[1])
  })

  it('does not skip a player on a takeout at an empty board', () => {
    const evening = begin()
    expect(dartsRemoved(evening)).toBe(evening)
    const afterTurn = thrown(evening, manualMiss())
    expect(dartsRemoved(afterTurn)).toBe(afterTurn)
  })

  it('lets the control panel pass the turn, thrown or not', () => {
    let evening = begin()
    const order = evening.games[0]!.order
    evening = nextPlayer(evening)
    expect(activeState(evening)!.current!.player).toBe(order[1])
    evening = nextPlayer(addDart(evening, manualMiss(), 'board'))
    expect(activeState(evening)!.current!.player).toBe(order[2])
  })

  it('follows the board: darts, takeout, and a correction made in Autodarts', () => {
    let evening = begin()
    const own = ownSegment(evening, 1)
    evening = applyBoardEvent(evening, { type: 'dartThrown', dart: manualMiss(), index: 0 })
    evening = addDart(evening, manualMiss(), 'hand')
    evening = applyBoardEvent(evening, { type: 'throwsCorrected', throws: [own] })
    const turn = evening.games[0]!.turns[0]!
    expect(turn.darts.map((d) => [d.dart.name, d.by])).toEqual([
      [own.name, 'board'],
      ['Miss', 'hand'],
    ])
    evening = applyBoardEvent(evening, { type: 'boardReset' })
    evening = applyBoardEvent(evening, { type: 'boardStuck' })
    expect(evening.games[0]!.turns[0]!.done).toBe(false)
    evening = applyBoardEvent(evening, { type: 'dartsRemoved' })
    expect(evening.games[0]!.turns[0]!.done).toBe(true)
  })
})

describe('corrections', () => {
  it('recounts everything when an earlier dart is corrected', () => {
    let evening = begin()
    const first = evening.games[0]!.order[0]!
    evening = thrown(evening, manualMiss(), manualMiss(), manualMiss())
    expect(activeState(evening)!.view.positions[first]).toBe(0)
    const fix = manualDart((evening.games[0]!.setup as RaceSetup).segments[first]![0], 3)
    evening = correctDart(evening, 0, 1, fix)
    expect(activeState(evening)!.view.positions[first]).toBe(3)
    expect(evening.games[0]!.turns[0]!.darts[1]!.by).toBe('hand')
  })

  it('reopens a finished game when the winning dart is corrected', () => {
    let evening = winRace(begin(), 'ann')
    expect(canAdvance(evening)).toBe(true)
    const turns = evening.games[0]!.turns
    const lastTurn = turns.length - 1
    evening = correctDart(evening, lastTurn, turns[lastTurn]!.darts.length - 1, manualMiss())
    expect(activeState(evening)!.finished).toBe(false)
    expect(canAdvance(evening)).toBe(false)
    expect(advance(evening, seededRandom(1))).toBe(evening)
  })

  it('takes back the last dart of the open turn only', () => {
    let evening = addDart(begin(), manualMiss(), 'board')
    evening = removeLastDart(evening)
    expect(evening.games[0]!.turns[0]!.darts).toEqual([])
    const done = thrown(begin(), manualMiss())
    expect(removeLastDart(done)).toBe(done)
  })

  it('never changes the evening it was given', () => {
    const before = begin()
    const copy = JSON.stringify(before)
    correctDart(thrown(before, manualMiss()), 0, 0, manualDart(20, 3))
    expect(JSON.stringify(before)).toBe(copy)
  })
})

describe('between games', () => {
  it('scores a finished game by place and draws the next', () => {
    const random = seededRandom(7)
    let evening = winRace(begin(), 'cy')
    expect(standings(evening)[0]).toEqual({ player: 'cy', points: 4, perGame: [4] })
    // The other three never moved: they share second place.
    expect(standings(evening).slice(1).map((row) => row.points)).toEqual([3, 3, 3])
    evening = advance(evening, random)
    expect(evening.stage).toBe('draw')
    expect(evening.games).toHaveLength(2)
  })

  it('lets the last in the standings start, the leader throw last', () => {
    const random = seededRandom(7)
    let evening = winRace(begin(), 'cy')
    const firstOrder = evening.games[0]!.order
    evening = advance(evening, random)
    const order = evening.games[1]!.order
    expect(order.at(-1)).toBe('cy')
    // The three level players keep their order from the first game.
    expect(order.slice(0, 3)).toEqual(firstOrder.filter((p) => p !== 'cy'))
  })

  it('does not count a game that is still being played', () => {
    const evening = thrown(begin(), manualMiss())
    expect(standings(evening).every((row) => row.points === 0 && row.perGame.length === 0)).toBe(true)
  })

  it('repeats a game only when there is nothing else left to draw', () => {
    const random = seededRandom(3)
    let evening = winRace(begin(four, 3), 'ann')
    evening = advance(evening, random)
    expect(evening.games[1]!.gameId).toBe('race')
  })
})

describe('the end of the evening', () => {
  function playEvening(winners: string[], players = four): Evening {
    const random = seededRandom(11)
    let evening = begin(players, winners.length)
    winners.forEach((winner, i) => {
      evening = winRace(evening, winner)
      evening = advance(evening, random)
      if (i < winners.length - 1) evening = advance(advance(evening, random), random)
    })
    return evening
  }

  it('goes to the podium when there is one winner', () => {
    const evening = playEvening(['ann', 'ann'])
    expect(evening.stage).toBe('podium')
    expect(finalRanking(evening)[0]).toEqual(['ann'])
    expect(canAdvance(evening)).toBe(false)
  })

  it('plays a deciding round between the players level at the top only', () => {
    // ann and bob each win once: 4 + 3 = 7 points each, cy and di 6.
    let evening = playEvening(['ann', 'bob'])
    expect(evening.stage).toBe('decider')
    const round = evening.deciders[0]!
    expect([...round.order].sort()).toEqual(['ann', 'bob'])
    expect(activeState(evening)!.current).toMatchObject({ dartsLeft: 3, round: 1 })

    const [first, second] = round.order
    evening = thrown(evening, manualDart(20, 1), manualDart(5, 1), manualMiss())
    evening = thrown(evening, manualDart(20, 3), manualMiss(), manualMiss())
    expect(activeState(evening)!.finished).toBe(true)
    evening = advance(evening, seededRandom(1))
    expect(evening.stage).toBe('podium')
    const ranking = finalRanking(evening)
    expect(ranking.slice(0, 2)).toEqual([[second], [first]])
    // The tie for third is not played off.
    expect([...ranking[2]!].sort()).toEqual(['cy', 'di'])
  })

  it('plays again, with only those still level, when the round is tied too', () => {
    let evening = playEvening(['ann', 'bob', 'cy'], people('ann', 'bob', 'cy'))
    expect(evening.deciders[0]!.order).toHaveLength(3)
    const [a, b, c] = evening.deciders[0]!.order
    evening = thrown(evening, manualDart(20, 1))
    evening = thrown(evening, manualDart(20, 1))
    evening = thrown(evening, manualDart(1, 1))
    evening = advance(evening, seededRandom(1))
    expect(evening.stage).toBe('decider')
    expect(evening.deciders[1]!.order).toEqual([a, b])
    expect(finalRanking(evening)).toEqual([[a, b], [c]])

    evening = thrown(evening, manualMiss())
    evening = thrown(evening, manualDart(1, 1))
    evening = advance(evening, seededRandom(1))
    expect(evening.stage).toBe('podium')
    expect(finalRanking(evening)).toEqual([[b], [a], [c]])
  })

  it('survives being saved and loaded', () => {
    const evening = playEvening(['ann', 'bob'])
    const loaded: Evening = JSON.parse(JSON.stringify(evening))
    expect(finalRanking(loaded)).toEqual(finalRanking(evening))
    expect(standings(loaded)).toEqual(standings(evening))
  })
})
