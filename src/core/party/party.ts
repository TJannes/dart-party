import type { BoardEvent } from '../board/events'
import type { Dart } from '../board/state'
import { rulesFor } from '../game/registry'
import {
  rankByScore,
  type GameState,
  type PlayerId,
  type Ranking,
  type ThrownDart,
  type Turn,
} from '../game/types'
import { pick, shuffle, type Random } from '../random'
import { pointsForRanking } from './points'

// One party: a fixed group of players, a number of drawn mini-games, a
// running scoreboard and a winner.
//
// The Party object is the whole truth and is plain data, so it can be
// saved after every dart. It holds only what was decided or thrown; scores,
// standings and whose turn it is are always worked out from it. Every
// command returns a new Party and leaves the old one untouched.

export const MIN_PLAYERS = 2
/** Free play can be played alone, handy for trying the board. */
export const MIN_FREE_PLAYERS = 1
export const MAX_PLAYERS = 8
export const DEFAULT_GAMES = 5

export interface Player {
  id: PlayerId
  name: string
  avatar: string
}

/** One mini-game (or deciding round) as played. */
export interface GameRecord {
  gameId: string
  /** The throwing order. */
  order: PlayerId[]
  /** What chance decided before the first dart; shape depends on the game. */
  setup: unknown
  turns: Turn[]
}

export type Stage =
  /** The next game is being drawn. It is already decided: `games.at(-1)`. */
  | 'draw'
  /** The rules card of the drawn game is on screen. */
  | 'rules'
  /** Darts count. Stays here after the last dart until someone moves on. */
  | 'playing'
  /** A deciding round for a tie at the top: `deciders.at(-1)`. */
  | 'decider'
  | 'podium'

export interface Party {
  players: Player[]
  gamesPlanned: number
  /** The mini-games that may be drawn. */
  enabledGames: string[]
  stage: Stage
  games: GameRecord[]
  deciders: GameRecord[]
  /**
   * True for free play: one game on its own, straight at the board, with
   * no draw, no points and no podium. `games` holds just that game.
   */
  freePlay?: boolean
}

export interface StandingsRow {
  player: PlayerId
  points: number
  /** Points per finished game, in order. */
  perGame: number[]
}

// ---------------------------------------------------------------- reading

export function evaluateRecord(record: GameRecord): GameState<any> {
  return rulesFor(record.gameId).evaluate(record.setup, record.order, record.turns)
}

/** The game or deciding round that darts go to right now, if any. */
export function activeRecord(party: Party): GameRecord | null {
  if (party.stage === 'playing') return party.games.at(-1) ?? null
  if (party.stage === 'decider') return party.deciders.at(-1) ?? null
  return null
}

export function activeState(party: Party): GameState<any> | null {
  const record = activeRecord(party)
  return record ? evaluateRecord(record) : null
}

/** The scoreboard over all finished games, best first. */
export function standings(party: Party): StandingsRow[] {
  const rows = new Map<PlayerId, StandingsRow>(
    party.players.map((p) => [p.id, { player: p.id, points: 0, perGame: [] }]),
  )
  for (const record of party.games) {
    const state = evaluateRecord(record)
    if (!state.finished) continue
    const points = pointsForRanking(state.ranking)
    for (const row of rows.values()) {
      const earned = points[row.player] ?? 0
      row.points += earned
      row.perGame.push(earned)
    }
  }
  // A stable sort: equal points keep the order the players were entered in.
  return [...rows.values()].sort((a, b) => b.points - a.points)
}

function finishedGames(party: Party): number {
  return party.games.filter((record) => evaluateRecord(record).finished).length
}

/**
 * The final ranking of the party. Only a tie for first place is played
 * off; each deciding round orders the players who were still level.
 */
export function finalRanking(party: Party): Ranking {
  const rows = standings(party)
  const byPoints = rankByScore(
    rows.map((row) => row.player),
    (player) => rows.find((row) => row.player === player)!.points,
  )
  let level = byPoints[0] ?? []
  let settled: Ranking = []
  for (const record of party.deciders) {
    const state = evaluateRecord(record)
    if (!state.finished) break
    // The round was played by exactly the players who were still level.
    level = state.ranking[0] ?? []
    settled = [...state.ranking.slice(1), ...settled]
  }
  return [level, ...settled, ...byPoints.slice(1)]
}

/** The players still level for first place, or none when it is settled. */
function tiedForFirst(party: Party): PlayerId[] {
  const leaders = finalRanking(party)[0] ?? []
  return leaders.length > 1 ? leaders : []
}

// ------------------------------------------------------------- commands

export function startParty(
  players: readonly Player[],
  gamesPlanned: number,
  enabledGames: readonly string[],
  random: Random,
): Party {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`A party needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`)
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) {
    throw new Error('A player can only join once')
  }
  if (!Number.isInteger(gamesPlanned) || gamesPlanned < 1) {
    throw new Error('A party needs at least one game')
  }
  if (enabledGames.length === 0) throw new Error('No mini-games are switched on')

  const party: Party = {
    players: [...players],
    gamesPlanned,
    enabledGames: [...enabledGames],
    stage: 'draw',
    games: [],
    deciders: [],
  }
  return drawNextGame(party, random)
}

/** A single game outside a party. `setup` must suit the game. */
export function startFreePlay(players: readonly Player[], gameId: string, setup: unknown): Party {
  if (players.length < MIN_FREE_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Free play needs ${MIN_FREE_PLAYERS} to ${MAX_PLAYERS} players`)
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) {
    throw new Error('A player can only join once')
  }
  const order = players.map((p) => p.id)
  // Fails here, not at the first dart, if the setup does not suit the game.
  rulesFor(gameId).evaluate(setup, order, [])
  return {
    players: [...players],
    gamesPlanned: 1,
    enabledGames: [gameId],
    stage: 'playing',
    games: [{ gameId, order, setup, turns: [] }],
    deciders: [],
    freePlay: true,
  }
}

/** The same free-play game again; whoever started now throws last. */
export function playAgain(party: Party): Party {
  const last = party.games.at(-1)
  if (!party.freePlay || !last) return party
  const order = [...last.order.slice(1), ...last.order.slice(0, 1)]
  return { ...party, games: [{ gameId: last.gameId, order, setup: last.setup, turns: [] }] }
}

/** The first game's order is drawn; after that the last in the standings starts. */
function throwingOrder(party: Party, random: Random): PlayerId[] {
  const previous = party.games.at(-1)
  if (!previous) return shuffle(random, party.players.map((p) => p.id))
  const points = new Map(standings(party).map((row) => [row.player, row.points]))
  // Fewest points first. Level players keep their order from the last game.
  return [...previous.order].sort((a, b) => points.get(a)! - points.get(b)!)
}

function drawNextGame(party: Party, random: Random): Party {
  const played = new Set(party.games.map((record) => record.gameId))
  const fresh = party.enabledGames.filter((id) => !played.has(id))
  // No game twice, unless there are fewer games than the party is long.
  // Then at least not the same one twice in a row, if there is a choice.
  const last = party.games.at(-1)?.gameId
  const notLast = party.enabledGames.filter((id) => id !== last)
  const candidates = fresh.length > 0 ? fresh : notLast.length > 0 ? notLast : party.enabledGames
  const gameId = pick(random, candidates)
  const order = throwingOrder(party, random)
  const setup = rulesFor(gameId).setup(order, random)
  return {
    ...party,
    stage: 'draw',
    games: [...party.games, { gameId, order, setup, turns: [] }],
  }
}

function startDecider(party: Party, players: PlayerId[]): Party {
  // Same idea as between games: the order follows the last game played.
  const lastOrder = party.deciders.at(-1)?.order ?? party.games.at(-1)?.order ?? players
  const order = lastOrder.filter((player) => players.includes(player))
  const record: GameRecord = { gameId: 'decider', order, setup: null, turns: [] }
  return { ...party, stage: 'decider', deciders: [...party.deciders, record] }
}

/** True when "continue" would do something: the step on screen is over. */
export function canAdvance(party: Party): boolean {
  switch (party.stage) {
    case 'draw':
    case 'rules':
      return true
    case 'playing':
    case 'decider':
      return activeState(party)?.finished === true
    case 'podium':
      return false
  }
}

/** Moves on to the next step of the party. Does nothing mid-game. */
export function advance(party: Party, random: Random): Party {
  // Free play has nowhere to go on to: it is played again or left.
  if (party.freePlay || !canAdvance(party)) return party
  if (party.stage === 'draw') return { ...party, stage: 'rules' }
  if (party.stage === 'rules') return { ...party, stage: 'playing' }
  if (party.stage === 'playing' && finishedGames(party) < party.gamesPlanned) {
    return drawNextGame(party, random)
  }
  // The last game or a deciding round is over: is there one winner?
  const tied = tiedForFirst(party)
  return tied.length > 0 ? startDecider(party, tied) : { ...party, stage: 'podium' }
}

function withActiveTurns(party: Party, change: (turns: Turn[], record: GameRecord) => Turn[]): Party {
  const record = activeRecord(party)
  if (!record) return party
  const turns = change(record.turns, record)
  if (turns === record.turns) return party
  const updated = { ...record, turns }
  return party.stage === 'playing'
    ? { ...party, games: [...party.games.slice(0, -1), updated] }
    : { ...party, deciders: [...party.deciders.slice(0, -1), updated] }
}

/** A turn that a rule ended while its darts are still in the board. */
function closeStale(turns: Turn[]): Turn[] {
  const last = turns.at(-1)
  return last && !last.done ? [...turns.slice(0, -1), { ...last, done: true }] : turns
}

/** A dart for whoever is at the board. Ignored when nobody can throw. */
export function addDart(party: Party, dart: Dart, by: ThrownDart['by']): Party {
  return withActiveTurns(party, (turns, record) => {
    const current = evaluateRecord(record).current
    if (!current || current.dartsLeft <= 0) return turns
    const open = turns[current.turn]
    if (open) {
      return turns.map((turn, i) =>
        i === current.turn ? { ...turn, darts: [...turn.darts, { dart, by }] } : turn,
      )
    }
    return [...closeStale(turns), { darts: [{ dart, by }], done: false }]
  })
}

/**
 * The darts were pulled out. Ends the turn if darts were thrown in it; a
 * takeout at an empty board is not a turn.
 */
export function dartsRemoved(party: Party): Party {
  return withActiveTurns(party, (turns) => {
    const open = turns.at(-1)
    if (!open || open.done || open.darts.length === 0) return turns
    return [...turns.slice(0, -1), { ...open, done: true }]
  })
}

/** "Next player" on the control panel: ends the turn, thrown or not. */
export function nextPlayer(party: Party): Party {
  return withActiveTurns(party, (turns, record) => {
    const current = evaluateRecord(record).current
    if (!current) return turns
    if (turns[current.turn]) {
      return turns.map((turn, i) => (i === current.turn ? { ...turn, done: true } : turn))
    }
    return [...closeStale(turns), { darts: [], done: true }]
  })
}

/** Replaces one dart of the current game. Everything after is recounted. */
export function correctDart(
  party: Party,
  turnIndex: number,
  dartIndex: number,
  dart: Dart,
): Party {
  return withActiveTurns(party, (turns) => {
    const turn = turns[turnIndex]
    if (!turn || !turn.darts[dartIndex]) return turns
    const darts = turn.darts.map((old, i) => (i === dartIndex ? { dart, by: 'hand' as const } : old))
    return turns.map((old, i) => (i === turnIndex ? { ...old, darts } : old))
  })
}

/** Takes back the last dart of the turn in progress. */
export function removeLastDart(party: Party): Party {
  return withActiveTurns(party, (turns) => {
    const open = turns.at(-1)
    if (!open || open.done || open.darts.length === 0) return turns
    return [...turns.slice(0, -1), { ...open, darts: open.darts.slice(0, -1) }]
  })
}

/**
 * The darts of this turn were edited inside Autodarts. The board's darts
 * are replaced by the new list; darts entered by hand stay, after them.
 */
function throwsCorrected(party: Party, throws: readonly Dart[]): Party {
  return withActiveTurns(party, (turns, record) => {
    const open = turns.at(-1)
    const byHand = open && !open.done ? open.darts.filter((d) => d.by === 'hand') : []
    const darts: ThrownDart[] = [
      ...throws.map((dart) => ({ dart, by: 'board' as const })),
      ...byHand,
    ].slice(0, rulesFor(record.gameId).dartsPerTurn)
    if (open && !open.done) return [...turns.slice(0, -1), { ...open, darts }]
    if (darts.length === 0 || !evaluateRecord(record).current) return turns
    return [...turns, { darts, done: false }]
  })
}

/** What an event from the board means for the party. */
export function applyBoardEvent(party: Party, event: BoardEvent): Party {
  switch (event.type) {
    case 'dartThrown':
      return addDart(party, event.dart, 'board')
    case 'dartsRemoved':
      return dartsRemoved(party)
    case 'throwsCorrected':
      return throwsCorrected(party, event.throws)
    default:
      // A reset, a stuck board or a lost connection changes no score.
      return party
  }
}
