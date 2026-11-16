import { rulesFor } from '../game/registry'
import type { DartFeedback, Moment, PlayerId, Ranking } from '../game/types'
import { pick, randomInt, type Random } from '../random'
import { featOf } from './cues'
import { evaluateRecord, finalRanking, type Party } from './party'

// The drinking game: a layer on top of a party that never touches a score.
//
// Who has to drink is worked out from the darts, like the standings, so a
// corrected dart corrects the sips too. The rules hang on what every game
// reports (moments, the verdict per dart, the ranking), never on one game,
// so a new mini-game takes part without knowing about any of this.
//
// Only what cannot be worked out is kept: which rules are on, who sits out
// and since when, and what the wheel landed on.

/** Every rule that can be switched off, in the order the settings list them. */
export const DRINK_RULES = [
  'threeMisses',
  'emptyTurn',
  'pointsLost',
  'lifeLost',
  'knockedOut',
  'barDropped',
  'feat',
  'afterGame',
  'podium',
] as const

export type DrinkRule = (typeof DRINK_RULES)[number]

/** The eight equal slots of the task wheel. */
export const WHEEL_TASKS = [
  'drink1',
  'handOut2',
  'everyone',
  'drink2',
  'buddy',
  'drink1',
  'everyoneElse',
  'safe',
] as const

export type WheelTask = (typeof WHEEL_TASKS)[number]

/**
 * A moment in the party, in the order things happen: the game, then the
 * phase within it (0 its darts, 1 its result, 2 the wheel after it, 3 the
 * podium), then the turn and the dart. A corrected dart keeps its position.
 */
export type Position = [game: number, phase: number, turn: number, dart: number]

/** The mode, or one player, switched off or on during the party. */
export interface DrinkSwitch {
  /** Counts for everything after this moment; what came before stays. */
  at: Position
  on: boolean
  /** One player sitting out or joining in; absent for the whole mode. */
  player?: PlayerId
}

export interface Wheel {
  player: PlayerId
  /** Where the task wheel stopped: an index into `WHEEL_TASKS`. */
  slot: number
  /** 'safe' also when the buddy slot came up with nobody to pick. */
  task: WheelTask
  /** Drinks along with `player` until the next wheel. */
  buddy?: PlayerId
}

export interface Drinking {
  rules: DrinkRule[]
  /** Who sat out from the start. */
  sitOut: PlayerId[]
  switches: DrinkSwitch[]
  /** The wheel spun after a game, by that game's number. None when skipped. */
  wheels: Record<number, Wheel>
}

export interface DrinkOrder {
  at: Position
  source: DrinkRule | 'wheel'
  player: PlayerId
  kind: 'drink' | 'handOut'
  sips: number
  /** Set when this player only drinks along, as the buddy of that player. */
  with?: PlayerId
}

export interface DrinkTally {
  drunk: number
  handedOut: number
}

export function newDrinking(rules: readonly DrinkRule[], sitOut: readonly PlayerId[] = []): Drinking {
  return {
    rules: DRINK_RULES.filter((rule) => rules.includes(rule)),
    sitOut: [...sitOut],
    switches: [],
    wheels: {},
  }
}

// ---------------------------------------------------------------- reading

const isAfter = (a: Position, b: Position): boolean => {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i]! > b[i]!
  return false
}

/** The last switch thrown before `at` that `matches`, if any. */
function lastSwitch(drinking: Drinking, at: Position | null, matches: (s: DrinkSwitch) => boolean): DrinkSwitch | undefined {
  return drinking.switches.filter((s) => matches(s) && (at === null || isAfter(at, s.at))).at(-1)
}

/** Whether the mode is on for something happening at `at` (null: from now on). */
function modeOn(drinking: Drinking, at: Position | null): boolean {
  return lastSwitch(drinking, at, (s) => s.player === undefined)?.on ?? true
}

/** Whether `player` takes sips for something happening at `at` (null: from now on). */
function takesSips(drinking: Drinking, player: PlayerId, at: Position | null): boolean {
  return lastSwitch(drinking, at, (s) => s.player === player)?.on ?? !drinking.sitOut.includes(player)
}

/** How the mode stands for whatever happens next. */
export function drinkingNow(party: Party): { on: boolean; sitOut: PlayerId[] } {
  const drinking = party.drinking
  if (!drinking) return { on: false, sitOut: [] }
  return {
    on: modeOn(drinking, null),
    sitOut: party.players.map((p) => p.id).filter((player) => !takesSips(drinking, player, null)),
  }
}

/** The last thing that happened in the party: a switch counts for what comes after it. */
export function drinkPosition(party: Party): Position {
  const game = party.games.length - 1
  if (party.stage === 'podium') return [game, 3, 0, 0]
  if (party.stage === 'decider') return [game, 2, 0, 0]
  if (party.stage === 'wheel') return [game, party.drinking?.wheels[game] ? 2 : 1, 0, 0]
  const record = party.games[game]
  if (party.stage !== 'playing' || !record) return [game, 0, -1, -1]
  const state = evaluateRecord(record)
  if (state.finished) return [game, 1, 0, 0]
  const last = state.played.at(-1)
  return last ? [game, 0, last.turn, last.index] : [game, 0, -1, -1]
}

/** The buddy pair that holds at `at`: from one wheel until the next one is due. */
function buddyAt(drinking: Drinking, at: Position): { of: PlayerId; buddy: PlayerId } | null {
  const wheel = drinking.wheels[at[0] - 1]
  // Phase 2 is the next wheel itself, which wipes the pair, spun or skipped.
  if (!wheel?.buddy || at[1] === 2) return null
  return { of: wheel.player, buddy: wheel.buddy }
}

type Candidate = Omit<DrinkOrder, 'at'>

/**
 * The orders of one moment, from everything that asked for one: rules that
 * are off and players who sit out drop away, a buddy drinks along, and
 * each player keeps only the heaviest.
 */
function settle(drinking: Drinking, at: Position, candidates: readonly Candidate[]): DrinkOrder[] {
  if (!modeOn(drinking, at)) return []
  const allowed = candidates.filter(
    (c) =>
      c.sips > 0 &&
      (c.source === 'wheel' || drinking.rules.includes(c.source)) &&
      // Handing out is open to everyone; only drinking can be sat out.
      (c.kind === 'handOut' || takesSips(drinking, c.player, at)),
  )
  const pair = buddyAt(drinking, at)
  const along =
    pair && takesSips(drinking, pair.buddy, at)
      ? allowed
          .filter((c) => c.kind === 'drink' && c.player === pair.of)
          .map((c): Candidate => ({ ...c, player: pair.buddy, with: pair.of }))
      : []

  const heaviest = new Map<PlayerId, Candidate>()
  for (const candidate of [...allowed, ...along]) {
    const held = heaviest.get(candidate.player)
    const heavier =
      !held ||
      candidate.sips > held.sips ||
      (candidate.sips === held.sips && candidate.kind === 'drink' && held.kind === 'handOut')
    if (heavier) heaviest.set(candidate.player, candidate)
  }
  return [...heaviest.values()].map((candidate) => ({ at, ...candidate }))
}

function fromMoment(moment: Moment): Candidate | null {
  switch (moment.kind) {
    case 'lost':
      return { source: 'pointsLost', player: moment.player, kind: 'drink', sips: 1 }
    case 'lifeLost':
    case 'exploded':
      return { source: 'lifeLost', player: moment.player, kind: 'drink', sips: 1 }
    case 'knockedOut':
      return { source: 'knockedOut', player: moment.player, kind: 'drink', sips: 2 }
    case 'jump':
      return moment.cleared ? null : { source: 'barDropped', player: moment.player, kind: 'drink', sips: 1 }
    default:
      return null
  }
}

const EMPTY: DartFeedback[] = ['neutral', 'bad']

/** What the darts of one game make people drink. */
function dartOrders(party: Party, drinking: Drinking, game: number): DrinkOrder[] {
  const record = party.games[game]!
  const rules = rulesFor(record.gameId)
  const state = evaluateRecord(record)
  return state.played.flatMap((played, n) => {
    const candidates: Candidate[] = played.moments.flatMap((moment) => fromMoment(moment) ?? [])
    const thrower = played.thrower
    const darts = record.turns[played.turn]!.darts.slice(0, played.index + 1).map((thrown) => thrown.dart)

    const feat = featOf(rules, darts)
    if (feat === 'threeMisses') {
      candidates.push({ source: 'threeMisses', player: thrower, kind: 'drink', sips: 1 })
    }
    // As on screen: a dart that hurt its thrower is no feat.
    if ((feat === 'oneEighty' || feat === 'hatTrick') && state.feedback[n] !== 'bad') {
      candidates.push({ source: 'feat', player: thrower, kind: 'handOut', sips: 1 })
    }

    // A full turn that brought the thrower nothing, judged on its last dart.
    if (!rules.emptyTurnsAreNormal && played.index === rules.dartsPerTurn - 1) {
      const first = n - played.index
      const turn = state.played.slice(first, n + 1)
      const nothing =
        state.feedback.slice(first, n + 1).every((feedback) => EMPTY.includes(feedback)) &&
        !turn.some((dart) => dart.moments.some((m) => m.kind === 'scored' && m.player === thrower))
      if (nothing) candidates.push({ source: 'emptyTurn', player: thrower, kind: 'drink', sips: 1 })
    }

    return settle(drinking, [game, 0, played.turn, played.index], candidates)
  })
}

/** How many players at the bottom drink after a game. */
const lastPlaces = (players: number): number => (players <= 4 ? 1 : players <= 6 ? 2 : 3)

/**
 * The players at the bottom of a ranking: at least `count`, plus anyone who
 * shares a place with one of them. Never the winners.
 */
function bottomOf(ranking: Ranking, count: number): PlayerId[] {
  const bottom: PlayerId[] = []
  for (const group of ranking.slice(1).reverse()) {
    if (bottom.length >= count) break
    bottom.push(...group)
  }
  return bottom
}

/** The result of a game: the last drink, the winner hands out as many sips as there are drinkers. */
function afterGameOrders(party: Party, drinking: Drinking, game: number): DrinkOrder[] {
  const state = evaluateRecord(party.games[game]!)
  if (!state.finished) return []
  const at: Position = [game, 1, 0, 0]
  const players = state.ranking.reduce((sum, group) => sum + group.length, 0)
  const drinkers = bottomOf(state.ranking, lastPlaces(players)).filter((player) => takesSips(drinking, player, at))
  return settle(drinking, at, [
    ...drinkers.map((player): Candidate => ({ source: 'afterGame', player, kind: 'drink', sips: 1 })),
    ...(state.ranking[0] ?? []).map(
      (player): Candidate => ({ source: 'afterGame', player, kind: 'handOut', sips: drinkers.length }),
    ),
  ])
}

function wheelOrders(party: Party, drinking: Drinking, game: number): DrinkOrder[] {
  const wheel = drinking.wheels[game]
  if (!wheel) return []
  const at: Position = [game, 2, 0, 0]
  const drink = (player: PlayerId, sips: number): Candidate => ({ source: 'wheel', player, kind: 'drink', sips })
  const everyone = party.players.map((p) => p.id)
  const candidates: Record<WheelTask, Candidate[]> = {
    drink1: [drink(wheel.player, 1)],
    drink2: [drink(wheel.player, 2)],
    handOut2: [{ source: 'wheel', player: wheel.player, kind: 'handOut', sips: 2 }],
    everyone: everyone.map((player) => drink(player, 1)),
    everyoneElse: everyone.filter((player) => player !== wheel.player).map((player) => drink(player, 1)),
    buddy: [],
    safe: [],
  }
  return settle(drinking, at, candidates[wheel.task])
}

/** On the podium the last of the party drinks two and the winner hands out two. */
function podiumOrders(party: Party, drinking: Drinking): DrinkOrder[] {
  if (party.stage !== 'podium') return []
  const ranking = finalRanking(party)
  return settle(drinking, [party.games.length - 1, 3, 0, 0], [
    ...bottomOf(ranking, 1).map((player): Candidate => ({ source: 'podium', player, kind: 'drink', sips: 2 })),
    ...(ranking.length > 1 ? ranking[0]! : []).map(
      (player): Candidate => ({ source: 'podium', player, kind: 'handOut', sips: 2 }),
    ),
  ])
}

/** Every order of the party so far, in the order it was given. */
export function drinkOrders(party: Party): DrinkOrder[] {
  const drinking = party.drinking
  if (!drinking) return []
  return [
    ...party.games.flatMap((_, game) => [
      ...dartOrders(party, drinking, game),
      ...afterGameOrders(party, drinking, game),
      ...wheelOrders(party, drinking, game),
    ]),
    ...podiumOrders(party, drinking),
  ]
}

/** The orders one dart of a party game gave, for the banner. */
export function ordersOfDart(party: Party, game: number, turn: number, dart: number): DrinkOrder[] {
  const drinking = party.drinking
  if (!drinking || !party.games[game]) return []
  return dartOrders(party, drinking, game).filter((order) => order.at[2] === turn && order.at[3] === dart)
}

/** The orders the result of a game gave: who drinks, who hands out. */
export function ordersAfterGame(party: Party, game: number): DrinkOrder[] {
  const drinking = party.drinking
  if (!drinking || !party.games[game]) return []
  return afterGameOrders(party, drinking, game)
}

/** The orders of the podium. None before the party is there. */
export function ordersOnPodium(party: Party): DrinkOrder[] {
  return party.drinking ? podiumOrders(party, party.drinking) : []
}

/** The wheel spun after the last game played, if it was. */
export function wheelNow(party: Party): { wheel: Wheel; orders: DrinkOrder[] } | null {
  const game = party.games.length - 1
  const wheel = party.drinking?.wheels[game]
  return wheel ? { wheel, orders: wheelOrders(party, party.drinking!, game) } : null
}

/** Who can be picked as a buddy at the wheel on screen. */
export function buddyChoices(party: Party): PlayerId[] {
  const now = party.stage === 'wheel' ? wheelNow(party) : null
  if (now?.wheel.task !== 'buddy') return []
  return wheelPlayers(party).filter((player) => player !== now.wheel.player)
}

/** The buddy pair that holds right now, if any. */
export function buddyNow(party: Party): { of: PlayerId; buddy: PlayerId } | null {
  if (!party.drinking) return null
  const at = drinkPosition(party)
  // At the wheel the pair just made is already worth showing.
  const made = party.stage === 'wheel' ? party.drinking.wheels[at[0]] : undefined
  if (made?.buddy) return { of: made.player, buddy: made.buddy }
  return party.stage === 'wheel' ? null : buddyAt(party.drinking, [at[0], 0, 0, 0])
}

/** Sips taken and handed out per player. Every player has an entry. */
export function drinkTally(party: Party): Record<PlayerId, DrinkTally> {
  const tally: Record<PlayerId, DrinkTally> = {}
  for (const player of party.players) tally[player.id] = { drunk: 0, handedOut: 0 }
  for (const order of drinkOrders(party)) {
    const row = tally[order.player]
    if (!row) continue
    if (order.kind === 'drink') row.drunk += order.sips
    else row.handedOut += order.sips
  }
  return tally
}

/** The podium titles: who drank most and who handed out most. Shared when level, nobody at zero. */
export function drinkTitles(party: Party): { thirstiest: PlayerId[]; mostGenerous: PlayerId[] } {
  const tally = drinkTally(party)
  const top = (amount: (row: DrinkTally) => number): PlayerId[] => {
    const most = Math.max(0, ...Object.values(tally).map(amount))
    return most === 0 ? [] : party.players.map((p) => p.id).filter((player) => amount(tally[player]!) === most)
  }
  return { thirstiest: top((row) => row.drunk), mostGenerous: top((row) => row.handedOut) }
}

// ------------------------------------------------------------- commands

/** Who can come up on the player wheel after the last game played. */
export function wheelPlayers(party: Party): PlayerId[] {
  const drinking = party.drinking
  if (!drinking) return []
  const at: Position = [party.games.length - 1, 2, 0, 0]
  if (!modeOn(drinking, at)) return []
  return party.players.map((p) => p.id).filter((player) => takesSips(drinking, player, at))
}

/** True when a wheel belongs after the game just finished: the mode is on and someone drinks. */
export function wheelDue(party: Party): boolean {
  return wheelPlayers(party).length > 0
}

/** Spins both wheels. Once per game: the outcome is kept, not spun again. */
export function spinWheel(party: Party, random: Random): Party {
  const drinking = party.drinking
  const game = party.games.length - 1
  if (party.stage !== 'wheel' || !drinking || drinking.wheels[game]) return party
  const players = wheelPlayers(party)
  if (players.length === 0) return party
  const player = pick(random, players)
  const slot = randomInt(random, WHEEL_TASKS.length)
  // A buddy needs someone else who drinks; without one the slot is safe.
  const task = WHEEL_TASKS[slot] === 'buddy' && players.length < 2 ? 'safe' : WHEEL_TASKS[slot]!
  return { ...party, drinking: { ...drinking, wheels: { ...drinking.wheels, [game]: { player, slot, task } } } }
}

/** The player the wheel chose names a buddy. Can be changed until the party moves on. */
export function pickBuddy(party: Party, buddy: PlayerId): Party {
  const drinking = party.drinking
  const game = party.games.length - 1
  const wheel = drinking?.wheels[game]
  if (party.stage !== 'wheel' || !drinking || wheel?.task !== 'buddy') return party
  if (buddy === wheel.player || !wheelPlayers(party).includes(buddy)) return party
  return { ...party, drinking: { ...drinking, wheels: { ...drinking.wheels, [game]: { ...wheel, buddy } } } }
}

function withSwitch(party: Party, change: Omit<DrinkSwitch, 'at'>): Party {
  const drinking = party.drinking
  if (!drinking) return party
  const switches = [...drinking.switches, { at: drinkPosition(party), ...change }]
  return { ...party, drinking: { ...drinking, switches } }
}

/** Switches the whole mode off or back on, from now on. Sips already given stay. */
export function setDrinkingOn(party: Party, on: boolean): Party {
  return drinkingNow(party).on === on ? party : withSwitch(party, { on })
}

/** Lets one player sit out or join in again, from now on. */
export function setSitOut(party: Party, player: PlayerId, out: boolean): Party {
  if (!party.players.some((p) => p.id === player)) return party
  return drinkingNow(party).sitOut.includes(player) === out ? party : withSwitch(party, { on: !out, player })
}
