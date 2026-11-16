import { describe, expect, it } from 'vitest'
import { manualDart, manualMiss } from '../board/ring'
import type { Dart } from '../board/state'
import { seededRandom, type Random } from '../random'
import {
  DRINK_RULES,
  WHEEL_TASKS,
  drinkOrders,
  drinkTally,
  drinkTitles,
  drinkingNow,
  newDrinking,
  ordersOfLastDart,
  pickBuddy,
  setDrinkingOn,
  setSitOut,
  spinWheel,
  wheelDue,
  type DrinkOrder,
  type DrinkRule,
  type Wheel,
} from './drinking'
import {
  activeState,
  addDart,
  advance,
  correctDart,
  dartsRemoved,
  nextPlayer,
  removeLastDart,
  standings,
  startParty,
  type Party,
  type Player,
} from './party'

const people = (...names: string[]): Player[] => names.map((name) => ({ id: name, name, avatar: 'fox' }))
const S = (n: number) => manualDart(n, 1)
const T = (n: number) => manualDart(n, 3)
const miss = manualMiss()

/** A drinking party in the middle of one game, with a hand-made setup. */
function playing(
  gameId: string,
  setup: unknown,
  names = ['ann', 'bob', 'cy'],
  rules: readonly DrinkRule[] = DRINK_RULES,
  gamesPlanned = 1,
): Party {
  return {
    players: people(...names),
    gamesPlanned,
    enabledGames: [gameId],
    stage: 'playing',
    games: [{ gameId, order: names, setup, turns: [] }],
    deciders: [],
    drinking: newDrinking(rules),
  }
}

/** One turn: the darts, then the takeout. */
const turn = (party: Party, ...darts: Dart[]): Party =>
  dartsRemoved(darts.reduce((p, dart) => addDart(p, dart, 'board'), party))

/** Orders as short text: "ann drinks 1 (emptyTurn)". */
const told = (orders: DrinkOrder[]): string[] =>
  orders.map(
    (o) =>
      `${o.player} ${o.kind === 'drink' ? 'drinks' : 'hands out'} ${o.sips} (${o.source}${o.with ? ` with ${o.with}` : ''})`,
  )

const spotlightSetup = { targets: [20, 20, 20, 20, 20, 20] }
const segments = { ann: [1], bob: [2], cy: [3] }

/** A random source that returns these values in turn, then zeros. */
const fixed = (...values: number[]): Random => {
  let i = 0
  return () => values[i++] ?? 0
}

/** Plays a Piggy Bank game to its end: each player scores as given, every turn. */
function playPiggyBank(party: Party, score: Record<string, Dart>): Party {
  let p = party
  for (let guard = 0; guard < 200 && !activeState(p)!.finished; guard++) {
    p = turn(p, score[activeState(p)!.current!.player]!)
  }
  return p
}

describe('drinking: during a game', () => {
  it('asks nothing of a party that is not a drinking game', () => {
    const party = { ...playing('piggyBank', null), drinking: undefined }
    expect(drinkOrders(turn(party, miss, miss, miss))).toEqual([])
  })

  it('makes the thrower drink for three misses in one turn, once', () => {
    const party = turn(playing('piggyBank', null), miss, miss, miss)
    expect(told(drinkOrders(party))).toEqual(['ann drinks 1 (threeMisses)'])
  })

  it('makes the thrower drink for a turn that brings nothing', () => {
    // Segment 3 is nowhere near the spotlight on 20.
    const party = turn(playing('spotlight', spotlightSetup), S(3), S(3), S(3))
    expect(told(drinkOrders(party))).toEqual(['ann drinks 1 (emptyTurn)'])
  })

  it('does not call a turn empty when one dart scored, or when it was cut short', () => {
    const scored = turn(playing('spotlight', spotlightSetup), S(3), S(20), S(3))
    expect(drinkOrders(scored)).toEqual([])
    const short = turn(playing('spotlight', spotlightSetup), S(3), S(3))
    expect(drinkOrders(short)).toEqual([])
  })

  it('does not call a Robin Hood turn of three outer darts empty: it scored', () => {
    const party = turn(playing('robinHood', null), manualDart(20, 2), manualDart(20, 2), manualDart(20, 2))
    expect(told(drinkOrders(party)).filter((line) => line.includes('emptyTurn'))).toEqual([])
  })

  it('leaves empty turns alone in a game where they are normal, but not three misses', () => {
    const party = playing('lastOneStanding', { segments })
    expect(drinkOrders(turn(party, S(10), S(11), S(12)))).toEqual([])
    expect(told(drinkOrders(turn(party, miss, miss, miss)))).toEqual(['ann drinks 1 (threeMisses)'])
  })

  it('makes a player who loses points drink', () => {
    const party = turn(playing('piggyBank', null), S(20), miss)
    expect(told(drinkOrders(party))).toEqual(['ann drinks 1 (pointsLost)'])
  })

  it('gives one sip for a lost life, however many lives the dart took', () => {
    const party = turn(playing('lastOneStanding', { segments }), manualDart(2, 2))
    expect(told(drinkOrders(party))).toEqual(['bob drinks 1 (lifeLost)'])
  })

  it('gives two sips for a knockout, not three with the life lost', () => {
    const party = turn(playing('lastOneStanding', { segments }), T(2))
    expect(told(drinkOrders(party))).toEqual(['bob drinks 2 (knockedOut)'])
  })

  it('falls back to the lighter rule when the heavier one is switched off', () => {
    const rules = DRINK_RULES.filter((rule) => rule !== 'knockedOut')
    const party = turn(playing('lastOneStanding', { segments }, undefined, rules), T(2))
    expect(told(drinkOrders(party))).toEqual(['bob drinks 1 (lifeLost)'])
  })

  it('makes whoever knocks the bar off drink', () => {
    let party = turn(playing('raiseTheBar', null), S(20), S(19), S(18))
    party = turn(party, S(1), S(2), S(3))
    expect(told(drinkOrders(party))).toEqual(['bob drinks 1 (barDropped)'])
  })

  it('lets the thrower hand out a sip for three darts in one segment', () => {
    const party = turn(playing('piggyBank', null), S(5), S(5), S(5))
    expect(told(drinkOrders(party))).toEqual(['ann hands out 1 (feat)'])
  })

  it('follows a corrected dart, and forgets a dart taken back', () => {
    const three = turn(playing('piggyBank', null), miss, miss, miss)
    expect(drinkTally(three)['ann']).toEqual({ drunk: 1, handedOut: 0 })
    const corrected = correctDart(three, 0, 1, S(20))
    // The third dart now breaks a pig with 20 in it.
    expect(told(drinkOrders(corrected))).toEqual(['ann drinks 1 (pointsLost)'])

    const open = [S(20), miss].reduce((p, dart) => addDart(p, dart, 'board'), playing('piggyBank', null))
    expect(drinkTally(open)['ann']!.drunk).toBe(1)
    expect(drinkTally(removeLastDart(open))['ann']!.drunk).toBe(0)
  })

  it('never changes the standings', () => {
    const plain = playPiggyBank({ ...playing('piggyBank', null), drinking: undefined }, { ann: S(20), bob: S(5), cy: miss })
    const drinking = playPiggyBank(playing('piggyBank', null), { ann: S(20), bob: S(5), cy: miss })
    expect(standings(drinking)).toEqual(standings(plain))
  })
})

describe('drinking: sitting out and switching off', () => {
  it('gives a player who sits out nothing to drink, but lets them hand out', () => {
    let party = playing('piggyBank', null)
    party = { ...party, drinking: newDrinking(DRINK_RULES, ['ann']) }
    party = turn(party, miss, miss, miss)
    expect(drinkOrders(party)).toEqual([])
    party = turn(turn(party, S(1)), S(1))
    party = turn(party, S(5), S(5), S(5))
    expect(told(drinkOrders(party))).toEqual(['ann hands out 1 (feat)'])
  })

  it('counts a switch from that moment on and keeps earlier sips', () => {
    let party = turn(playing('piggyBank', null, ['ann', 'bob']), miss, miss, miss)
    party = setSitOut(party, 'ann', true)
    expect(drinkingNow(party)).toEqual({ on: true, sitOut: ['ann'] })
    party = turn(turn(party, S(1)), miss, miss, miss)
    expect(drinkTally(party)['ann']!.drunk).toBe(1)

    party = setSitOut(party, 'ann', false)
    party = turn(turn(party, S(1)), miss, miss, miss)
    expect(drinkTally(party)['ann']!.drunk).toBe(2)
  })

  it('switches the whole mode off and on again', () => {
    let party = setDrinkingOn(playing('piggyBank', null, ['ann', 'bob']), false)
    expect(drinkingNow(party).on).toBe(false)
    party = turn(party, miss, miss, miss)
    expect(drinkOrders(party)).toEqual([])
    party = setDrinkingOn(party, true)
    party = turn(party, miss, miss, miss)
    expect(told(drinkOrders(party))).toEqual(['bob drinks 1 (threeMisses)'])
  })

  it('does nothing when the switch is already that way, or the player is unknown', () => {
    const party = playing('piggyBank', null)
    expect(setDrinkingOn(party, true)).toBe(party)
    expect(setSitOut(party, 'ann', false)).toBe(party)
    expect(setSitOut(party, 'zed', true)).toBe(party)
  })
})

describe('drinking: after a game', () => {
  const afterGame = (party: Party): string[] => told(drinkOrders(party).filter((o) => o.source === 'afterGame'))
  const scores = (names: string[]): Record<string, Dart> =>
    // The first scores most, the last least: 20, 19, 18, ...
    Object.fromEntries(names.map((name, i) => [name, S(20 - i)]))

  it('makes the last drink and lets the winner hand out one, with up to four players', () => {
    const names = ['ann', 'bob', 'cy', 'di']
    const party = playPiggyBank(playing('piggyBank', null, names), scores(names))
    expect(afterGame(party)).toEqual(['di drinks 1 (afterGame)', 'ann hands out 1 (afterGame)'])
  })

  it('makes the last two drink with six players and the last three with eight', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(afterGame(playPiggyBank(playing('piggyBank', null, six), scores(six)))).toEqual([
      'f drinks 1 (afterGame)',
      'e drinks 1 (afterGame)',
      'a hands out 1 (afterGame)',
    ])
    const eight = [...six, 'g', 'h']
    expect(afterGame(playPiggyBank(playing('piggyBank', null, eight), scores(eight)))).toEqual([
      'h drinks 1 (afterGame)',
      'g drinks 1 (afterGame)',
      'f drinks 1 (afterGame)',
      'a hands out 1 (afterGame)',
    ])
  })

  it('makes players who share the last place drink together', () => {
    const names = ['ann', 'bob', 'cy']
    const party = playPiggyBank(playing('piggyBank', null, names), { ann: S(20), bob: S(5), cy: S(5) })
    expect(afterGame(party)).toEqual([
      'bob drinks 1 (afterGame)',
      'cy drinks 1 (afterGame)',
      'ann hands out 1 (afterGame)',
    ])
  })

  it('asks nothing when everyone is level', () => {
    const names = ['ann', 'bob']
    expect(afterGame(playPiggyBank(playing('piggyBank', null, names), { ann: S(5), bob: S(5) }))).toEqual([])
  })

  it('asks nothing while the game is still going', () => {
    expect(afterGame(turn(playing('piggyBank', null), S(20)))).toEqual([])
  })

  it('hands the orders of the dart that ended the game to the result', () => {
    const duel = { ann: [1], bob: [2] }
    const going = addDart(playing('lastOneStanding', { segments: duel }, ['ann', 'bob']), S(2), 'board')
    expect(ordersOfLastDart(going, 0)).toEqual([])
    const over = addDart(playing('lastOneStanding', { segments: duel }, ['ann', 'bob']), T(2), 'board')
    expect(activeState(over)!.finished).toBe(true)
    expect(told(ordersOfLastDart(over, 0))).toEqual(['bob drinks 2 (knockedOut)'])
  })
})

describe('drinking: the wheel', () => {
  const names = ['ann', 'bob', 'cy']
  const finished = (sitOut: string[] = []): Party => {
    const party = { ...playing('piggyBank', null, names, DRINK_RULES, 2), drinking: newDrinking(DRINK_RULES, sitOut) }
    return playPiggyBank(party, { ann: S(20), bob: S(10), cy: S(5) })
  }
  const atWheel = (sitOut: string[] = []): Party => advance(finished(sitOut), seededRandom(1))
  const slot = (task: string): number => (WHEEL_TASKS as readonly string[]).indexOf(task)
  /** A random source that lands on this player and this task. */
  const landing = (player: number, task: string, players = 3): Random =>
    fixed((player + 0.5) / players, (slot(task) + 0.5) / WHEEL_TASKS.length)
  const wheelOf = (party: Party): Wheel | undefined => party.drinking!.wheels[0]
  const fromWheel = (party: Party): string[] => told(drinkOrders(party).filter((o) => o.source === 'wheel'))

  it('has eight slots', () => {
    expect(WHEEL_TASKS).toHaveLength(8)
  })

  it('comes after a game when more games follow, and not in a party without drinking', () => {
    expect(atWheel().stage).toBe('wheel')
    const plain = advance({ ...finished(), drinking: undefined }, seededRandom(1))
    expect(plain.stage).toBe('draw')
  })

  it('is left out when the mode is off or nobody drinks', () => {
    expect(wheelDue(finished(names))).toBe(false)
    expect(advance(finished(names), seededRandom(1)).stage).toBe('draw')
    expect(advance(setDrinkingOn(finished(), false), seededRandom(1)).stage).toBe('draw')
  })

  it('does not come after the last game', () => {
    const last = playPiggyBank(playing('piggyBank', null, names), { ann: S(20), bob: S(10), cy: S(5) })
    expect(advance(last, seededRandom(1)).stage).toBe('podium')
  })

  it('picks a player and a task, once', () => {
    const spun = spinWheel(atWheel(), landing(1, 'drink2'))
    expect(wheelOf(spun)).toEqual({ player: 'bob', slot: slot('drink2'), task: 'drink2' })
    expect(fromWheel(spun)).toEqual(['bob drinks 2 (wheel)'])
    expect(spinWheel(spun, landing(0, 'safe'))).toBe(spun)
  })

  it('only spins at the wheel', () => {
    const party = finished()
    expect(spinWheel(party, seededRandom(1))).toBe(party)
  })

  it('never picks a player who sits out', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(wheelOf(spinWheel(atWheel(['ann']), seededRandom(seed)))!.player).not.toBe('ann')
    }
  })

  it('gives every task its orders', () => {
    const orders = (task: string): string[] => fromWheel(spinWheel(atWheel(), landing(0, task)))
    expect(orders('drink1')).toEqual(['ann drinks 1 (wheel)'])
    expect(orders('handOut2')).toEqual(['ann hands out 2 (wheel)'])
    expect(orders('everyone')).toEqual(['ann drinks 1 (wheel)', 'bob drinks 1 (wheel)', 'cy drinks 1 (wheel)'])
    expect(orders('everyoneElse')).toEqual(['bob drinks 1 (wheel)', 'cy drinks 1 (wheel)'])
    expect(orders('buddy')).toEqual([])
    expect(orders('safe')).toEqual([])
  })

  it('leaves players who sit out out of "everyone drinks"', () => {
    const spun = spinWheel(atWheel(['cy']), landing(0, 'everyone', 2))
    expect(fromWheel(spun)).toEqual(['ann drinks 1 (wheel)', 'bob drinks 1 (wheel)'])
  })

  it('is skipped by moving on without spinning', () => {
    const next = advance(atWheel(), seededRandom(1))
    expect(next.stage).toBe('draw')
    expect(next.games).toHaveLength(2)
    expect(next.drinking!.wheels).toEqual({})
  })

  it('lets the chosen player pick a buddy who drinks along until the next wheel', () => {
    let party = spinWheel(atWheel(), landing(0, 'buddy'))
    expect(pickBuddy(party, 'ann')).toBe(party)
    party = pickBuddy(party, 'bob')
    party = pickBuddy(party, 'cy')
    expect(wheelOf(party)!.buddy).toBe('cy')

    // On to the second game: draw, rules card, play.
    const random = seededRandom(1)
    party = advance(advance(advance(party, random), random), random)
    expect(party.stage).toBe('playing')
    const before = drinkTally(party)
    // Ann and cy both throw three misses: cy drinks along with ann, not the other way round.
    for (let guard = 0; guard < 3; guard++) {
      const player = activeState(party)!.current!.player
      party = player === 'bob' ? nextPlayer(party) : turn(party, miss, miss, miss)
    }
    const after = drinkTally(party)
    expect(after['ann']!.drunk - before['ann']!.drunk).toBe(1)
    expect(after['cy']!.drunk - before['cy']!.drunk).toBe(2)
    expect(told(drinkOrders(party))).toContain('cy drinks 1 (threeMisses with ann)')
  })

  it('does not let a player who sits out be the buddy', () => {
    const party = spinWheel(atWheel(['cy']), landing(0, 'buddy', 2))
    expect(pickBuddy(party, 'cy')).toBe(party)
  })

  it('makes the buddy slot safe when nobody else drinks', () => {
    const spun = spinWheel(atWheel(['bob', 'cy']), landing(0, 'buddy', 1))
    expect(wheelOf(spun)).toEqual({ player: 'ann', slot: slot('buddy'), task: 'safe' })
  })
})

describe('drinking: the podium', () => {
  const names = ['ann', 'bob', 'cy']
  const onPodium = (): Party => {
    const party = playPiggyBank(playing('piggyBank', null, names), { ann: S(20), bob: S(10), cy: S(5) })
    return advance(party, seededRandom(1))
  }

  it('makes the last of the party drink two and lets the winner hand out two', () => {
    const party = onPodium()
    expect(party.stage).toBe('podium')
    expect(told(drinkOrders(party).filter((o) => o.source === 'podium'))).toEqual([
      'cy drinks 2 (podium)',
      'ann hands out 2 (podium)',
    ])
  })

  it('names who drank most and who handed out most', () => {
    // Cy: last of the game (1) and of the party (2). Ann handed out 1 and 2.
    const party = onPodium()
    expect(drinkTally(party)).toEqual({
      ann: { drunk: 0, handedOut: 3 },
      bob: { drunk: 0, handedOut: 0 },
      cy: { drunk: 3, handedOut: 0 },
    })
    expect(drinkTitles(party)).toEqual({ thirstiest: ['cy'], mostGenerous: ['ann'] })
  })

  it('gives no titles when nobody drank', () => {
    expect(drinkTitles(playing('piggyBank', null))).toEqual({ thirstiest: [], mostGenerous: [] })
  })
})

describe('drinking: starting a party', () => {
  it('keeps the rules that are on and who sits out', () => {
    const party = startParty(people('ann', 'bob'), 2, ['race'], seededRandom(1), {
      rules: ['podium', 'threeMisses'],
      sitOut: ['bob'],
    })
    expect(party.drinking).toEqual({ rules: ['threeMisses', 'podium'], sitOut: ['bob'], switches: [], wheels: {} })
    expect(drinkingNow(party)).toEqual({ on: true, sitOut: ['bob'] })
  })

  it('is no drinking game unless asked', () => {
    const party = startParty(people('ann', 'bob'), 2, ['race'], seededRandom(1))
    expect(party.drinking).toBeUndefined()
    expect(drinkingNow(party)).toEqual({ on: false, sitOut: [] })
  })
})
