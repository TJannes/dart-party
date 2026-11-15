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
  startParty,
  type Party,
  type Player,
} from './party'
import { placesOf, pointsForRanking } from './points'

const people = (...names: string[]): Player[] =>
  names.map((name) => ({ id: name, name, avatar: 'fox' }))

const four = people('ann', 'bob', 'cy', 'di')

function begin(players = four, games = 2, seed = 1): Party {
  const random = seededRandom(seed)
  // Past the draw and the rules card, to the first dart.
  return advance(advance(startParty(players, games, ['race'], random), random), random)
}

const thrown = (party: Party, ...darts: Dart[]): Party =>
  dartsRemoved(darts.reduce((e, dart) => addDart(e, dart, 'board'), party))

/** A dart on the first segment of the player who is at the board. */
function ownSegment(party: Party, multiplier: 1 | 2 | 3 = 3): Dart {
  const record = party.games.at(-1)!
  const player = activeState(party)!.current!.player
  return manualDart((record.setup as RaceSetup).segments[player]![0], multiplier)
}

/** Lets the given player win the Race in progress; the others pass. */
function winRace(party: Party, winner: string): Party {
  let e = party
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

describe('starting a party', () => {
  it('needs two to eight players, each once', () => {
    const random = seededRandom(1)
    expect(() => startParty(people('ann'), 5, ['race'], random)).toThrow()
    expect(() => startParty(people('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'), 5, ['race'], random)).toThrow()
    expect(() => startParty(people('ann', 'ann'), 5, ['race'], random)).toThrow()
    expect(() => startParty(four, 5, [], random)).toThrow()
  })

  it('opens with the draw of the first game, then its rules, then play', () => {
    const random = seededRandom(1)
    let party = startParty(four, 5, ['race'], random)
    expect(party.stage).toBe('draw')
    expect(party.games).toHaveLength(1)
    expect(party.games[0]!.gameId).toBe('race')
    expect([...party.games[0]!.order].sort()).toEqual(['ann', 'bob', 'cy', 'di'])
    party = advance(party, random)
    expect(party.stage).toBe('rules')
    party = advance(party, random)
    expect(party.stage).toBe('playing')
  })

  it('draws the first throwing order', () => {
    const orders = new Set<string>()
    for (let seed = 0; seed < 30; seed++) orders.add(begin(four, 2, seed).games[0]!.order.join())
    expect(orders.size).toBeGreaterThan(5)
  })

  it('takes no darts before play starts', () => {
    const party = startParty(four, 5, ['race'], seededRandom(1))
    expect(addDart(party, manualMiss(), 'board')).toBe(party)
  })
})

describe('a turn', () => {
  it('takes three darts and passes on when they are pulled', () => {
    let party = begin()
    const [first, second] = party.games[0]!.order
    expect(activeState(party)!.current).toMatchObject({ player: first, dartsLeft: 3 })
    party = addDart(party, manualMiss(), 'board')
    party = addDart(party, manualMiss(), 'board')
    party = addDart(party, manualMiss(), 'board')
    expect(activeState(party)!.current).toMatchObject({ player: first, dartsLeft: 0 })
    // A fourth dart has nowhere to go.
    expect(addDart(party, manualMiss(), 'hand')).toBe(party)
    party = dartsRemoved(party)
    expect(activeState(party)!.current).toMatchObject({ player: second, dartsLeft: 3 })
  })

  it('passes on after a takeout with fewer than three darts', () => {
    const party = thrown(begin(), manualMiss())
    expect(activeState(party)!.current!.player).toBe(party.games[0]!.order[1])
  })

  it('does not skip a player on a takeout at an empty board', () => {
    const party = begin()
    expect(dartsRemoved(party)).toBe(party)
    const afterTurn = thrown(party, manualMiss())
    expect(dartsRemoved(afterTurn)).toBe(afterTurn)
  })

  it('lets the control panel pass the turn, thrown or not', () => {
    let party = begin()
    const order = party.games[0]!.order
    party = nextPlayer(party)
    expect(activeState(party)!.current!.player).toBe(order[1])
    party = nextPlayer(addDart(party, manualMiss(), 'board'))
    expect(activeState(party)!.current!.player).toBe(order[2])
  })

  it('follows the board: darts, takeout, and a correction made in Autodarts', () => {
    let party = begin()
    const own = ownSegment(party, 1)
    party = applyBoardEvent(party, { type: 'dartThrown', dart: manualMiss(), index: 0 })
    party = addDart(party, manualMiss(), 'hand')
    party = applyBoardEvent(party, { type: 'throwsCorrected', throws: [own] })
    const turn = party.games[0]!.turns[0]!
    expect(turn.darts.map((d) => [d.dart.name, d.by])).toEqual([
      [own.name, 'board'],
      ['Miss', 'hand'],
    ])
    party = applyBoardEvent(party, { type: 'boardReset' })
    party = applyBoardEvent(party, { type: 'boardStuck' })
    expect(party.games[0]!.turns[0]!.done).toBe(false)
    party = applyBoardEvent(party, { type: 'dartsRemoved' })
    expect(party.games[0]!.turns[0]!.done).toBe(true)
  })
})

describe('corrections', () => {
  it('recounts everything when an earlier dart is corrected', () => {
    let party = begin()
    const first = party.games[0]!.order[0]!
    party = thrown(party, manualMiss(), manualMiss(), manualMiss())
    expect(activeState(party)!.view.positions[first]).toBe(0)
    const fix = manualDart((party.games[0]!.setup as RaceSetup).segments[first]![0], 3)
    party = correctDart(party, 0, 1, fix)
    expect(activeState(party)!.view.positions[first]).toBe(3)
    expect(party.games[0]!.turns[0]!.darts[1]!.by).toBe('hand')
  })

  it('reopens a finished game when the winning dart is corrected', () => {
    let party = winRace(begin(), 'ann')
    expect(canAdvance(party)).toBe(true)
    const turns = party.games[0]!.turns
    const lastTurn = turns.length - 1
    party = correctDart(party, lastTurn, turns[lastTurn]!.darts.length - 1, manualMiss())
    expect(activeState(party)!.finished).toBe(false)
    expect(canAdvance(party)).toBe(false)
    expect(advance(party, seededRandom(1))).toBe(party)
  })

  it('takes back the last dart of the open turn only', () => {
    let party = addDart(begin(), manualMiss(), 'board')
    party = removeLastDart(party)
    expect(party.games[0]!.turns[0]!.darts).toEqual([])
    const done = thrown(begin(), manualMiss())
    expect(removeLastDart(done)).toBe(done)
  })

  it('never changes the party it was given', () => {
    const before = begin()
    const copy = JSON.stringify(before)
    correctDart(thrown(before, manualMiss()), 0, 0, manualDart(20, 3))
    expect(JSON.stringify(before)).toBe(copy)
  })
})

describe('between games', () => {
  it('scores a finished game by place and draws the next', () => {
    const random = seededRandom(7)
    let party = winRace(begin(), 'cy')
    expect(standings(party)[0]).toEqual({ player: 'cy', points: 4, perGame: [4] })
    // The other three never moved: they share second place.
    expect(standings(party).slice(1).map((row) => row.points)).toEqual([3, 3, 3])
    party = advance(party, random)
    expect(party.stage).toBe('draw')
    expect(party.games).toHaveLength(2)
  })

  it('lets the last in the standings start, the leader throw last', () => {
    const random = seededRandom(7)
    let party = winRace(begin(), 'cy')
    const firstOrder = party.games[0]!.order
    party = advance(party, random)
    const order = party.games[1]!.order
    expect(order.at(-1)).toBe('cy')
    // The three level players keep their order from the first game.
    expect(order.slice(0, 3)).toEqual(firstOrder.filter((p) => p !== 'cy'))
  })

  it('does not count a game that is still being played', () => {
    const party = thrown(begin(), manualMiss())
    expect(standings(party).every((row) => row.points === 0 && row.perGame.length === 0)).toBe(true)
  })

  it('repeats a game only when there is nothing else left to draw', () => {
    const random = seededRandom(3)
    let party = winRace(begin(four, 3), 'ann')
    party = advance(party, random)
    expect(party.games[1]!.gameId).toBe('race')
  })
})

describe('the end of the party', () => {
  function playParty(winners: string[], players = four): Party {
    const random = seededRandom(11)
    let party = begin(players, winners.length)
    winners.forEach((winner, i) => {
      party = winRace(party, winner)
      party = advance(party, random)
      if (i < winners.length - 1) party = advance(advance(party, random), random)
    })
    return party
  }

  it('goes to the podium when there is one winner', () => {
    const party = playParty(['ann', 'ann'])
    expect(party.stage).toBe('podium')
    expect(finalRanking(party)[0]).toEqual(['ann'])
    expect(canAdvance(party)).toBe(false)
  })

  it('plays a deciding round between the players level at the top only', () => {
    // ann and bob each win once: 4 + 3 = 7 points each, cy and di 6.
    let party = playParty(['ann', 'bob'])
    expect(party.stage).toBe('decider')
    const round = party.deciders[0]!
    expect([...round.order].sort()).toEqual(['ann', 'bob'])
    expect(activeState(party)!.current).toMatchObject({ dartsLeft: 3, round: 1 })

    const [first, second] = round.order
    party = thrown(party, manualDart(20, 1), manualDart(5, 1), manualMiss())
    party = thrown(party, manualDart(20, 3), manualMiss(), manualMiss())
    expect(activeState(party)!.finished).toBe(true)
    party = advance(party, seededRandom(1))
    expect(party.stage).toBe('podium')
    const ranking = finalRanking(party)
    expect(ranking.slice(0, 2)).toEqual([[second], [first]])
    // The tie for third is not played off.
    expect([...ranking[2]!].sort()).toEqual(['cy', 'di'])
  })

  it('plays again, with only those still level, when the round is tied too', () => {
    let party = playParty(['ann', 'bob', 'cy'], people('ann', 'bob', 'cy'))
    expect(party.deciders[0]!.order).toHaveLength(3)
    const [a, b, c] = party.deciders[0]!.order
    party = thrown(party, manualDart(20, 1))
    party = thrown(party, manualDart(20, 1))
    party = thrown(party, manualDart(1, 1))
    party = advance(party, seededRandom(1))
    expect(party.stage).toBe('decider')
    expect(party.deciders[1]!.order).toEqual([a, b])
    expect(finalRanking(party)).toEqual([[a, b], [c]])

    party = thrown(party, manualMiss())
    party = thrown(party, manualDart(1, 1))
    party = advance(party, seededRandom(1))
    expect(party.stage).toBe('podium')
    expect(finalRanking(party)).toEqual([[b], [a], [c]])
  })

  it('survives being saved and loaded', () => {
    const party = playParty(['ann', 'bob'])
    const loaded: Party = JSON.parse(JSON.stringify(party))
    expect(finalRanking(loaded)).toEqual(finalRanking(party))
    expect(standings(loaded)).toEqual(standings(party))
  })
})
