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

// One evening: a fixed group of players, a number of drawn mini-games, a
// running scoreboard and a winner.
//
// The Evening object is the whole truth and is plain data, so it can be
// saved after every dart. It holds only what was decided or thrown; scores,
// standings and whose turn it is are always worked out from it. Every
// command returns a new Evening and leaves the old one untouched.

export const MIN_PLAYERS = 2
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

export interface Evening {
  players: Player[]
  gamesPlanned: number
  /** The mini-games that may be drawn. */
  enabledGames: string[]
  stage: Stage
  games: GameRecord[]
  deciders: GameRecord[]
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
export function activeRecord(evening: Evening): GameRecord | null {
  if (evening.stage === 'playing') return evening.games.at(-1) ?? null
  if (evening.stage === 'decider') return evening.deciders.at(-1) ?? null
  return null
}

export function activeState(evening: Evening): GameState<any> | null {
  const record = activeRecord(evening)
  return record ? evaluateRecord(record) : null
}

/** The scoreboard over all finished games, best first. */
export function standings(evening: Evening): StandingsRow[] {
  const rows = new Map<PlayerId, StandingsRow>(
    evening.players.map((p) => [p.id, { player: p.id, points: 0, perGame: [] }]),
  )
  for (const record of evening.games) {
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

function finishedGames(evening: Evening): number {
  return evening.games.filter((record) => evaluateRecord(record).finished).length
}

/**
 * The final ranking of the evening. Only a tie for first place is played
 * off; each deciding round orders the players who were still level.
 */
export function finalRanking(evening: Evening): Ranking {
  const rows = standings(evening)
  const byPoints = rankByScore(
    rows.map((row) => row.player),
    (player) => rows.find((row) => row.player === player)!.points,
  )
  let level = byPoints[0] ?? []
  let settled: Ranking = []
  for (const record of evening.deciders) {
    const state = evaluateRecord(record)
    if (!state.finished) break
    // The round was played by exactly the players who were still level.
    level = state.ranking[0] ?? []
    settled = [...state.ranking.slice(1), ...settled]
  }
  return [level, ...settled, ...byPoints.slice(1)]
}

/** The players still level for first place, or none when it is settled. */
function tiedForFirst(evening: Evening): PlayerId[] {
  const leaders = finalRanking(evening)[0] ?? []
  return leaders.length > 1 ? leaders : []
}

// ------------------------------------------------------------- commands

export function startEvening(
  players: readonly Player[],
  gamesPlanned: number,
  enabledGames: readonly string[],
  random: Random,
): Evening {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`An evening needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`)
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) {
    throw new Error('A player can only join once')
  }
  if (!Number.isInteger(gamesPlanned) || gamesPlanned < 1) {
    throw new Error('An evening needs at least one game')
  }
  if (enabledGames.length === 0) throw new Error('No mini-games are switched on')

  const evening: Evening = {
    players: [...players],
    gamesPlanned,
    enabledGames: [...enabledGames],
    stage: 'draw',
    games: [],
    deciders: [],
  }
  return drawNextGame(evening, random)
}

/** The first game's order is drawn; after that the last in the standings starts. */
function throwingOrder(evening: Evening, random: Random): PlayerId[] {
  const previous = evening.games.at(-1)
  if (!previous) return shuffle(random, evening.players.map((p) => p.id))
  const points = new Map(standings(evening).map((row) => [row.player, row.points]))
  // Fewest points first. Level players keep their order from the last game.
  return [...previous.order].sort((a, b) => points.get(a)! - points.get(b)!)
}

function drawNextGame(evening: Evening, random: Random): Evening {
  const played = new Set(evening.games.map((record) => record.gameId))
  const fresh = evening.enabledGames.filter((id) => !played.has(id))
  // No game twice, unless there are fewer games than the evening is long.
  // Then at least not the same one twice in a row, if there is a choice.
  const last = evening.games.at(-1)?.gameId
  const notLast = evening.enabledGames.filter((id) => id !== last)
  const candidates = fresh.length > 0 ? fresh : notLast.length > 0 ? notLast : evening.enabledGames
  const gameId = pick(random, candidates)
  const order = throwingOrder(evening, random)
  const setup = rulesFor(gameId).setup(order, random)
  return {
    ...evening,
    stage: 'draw',
    games: [...evening.games, { gameId, order, setup, turns: [] }],
  }
}

function startDecider(evening: Evening, players: PlayerId[]): Evening {
  // Same idea as between games: the order follows the last game played.
  const lastOrder = evening.deciders.at(-1)?.order ?? evening.games.at(-1)?.order ?? players
  const order = lastOrder.filter((player) => players.includes(player))
  const record: GameRecord = { gameId: 'decider', order, setup: null, turns: [] }
  return { ...evening, stage: 'decider', deciders: [...evening.deciders, record] }
}

/** True when "continue" would do something: the step on screen is over. */
export function canAdvance(evening: Evening): boolean {
  switch (evening.stage) {
    case 'draw':
    case 'rules':
      return true
    case 'playing':
    case 'decider':
      return activeState(evening)?.finished === true
    case 'podium':
      return false
  }
}

/** Moves on to the next step of the evening. Does nothing mid-game. */
export function advance(evening: Evening, random: Random): Evening {
  if (!canAdvance(evening)) return evening
  if (evening.stage === 'draw') return { ...evening, stage: 'rules' }
  if (evening.stage === 'rules') return { ...evening, stage: 'playing' }
  if (evening.stage === 'playing' && finishedGames(evening) < evening.gamesPlanned) {
    return drawNextGame(evening, random)
  }
  // The last game or a deciding round is over: is there one winner?
  const tied = tiedForFirst(evening)
  return tied.length > 0 ? startDecider(evening, tied) : { ...evening, stage: 'podium' }
}

function withActiveTurns(evening: Evening, change: (turns: Turn[], record: GameRecord) => Turn[]): Evening {
  const record = activeRecord(evening)
  if (!record) return evening
  const turns = change(record.turns, record)
  if (turns === record.turns) return evening
  const updated = { ...record, turns }
  return evening.stage === 'playing'
    ? { ...evening, games: [...evening.games.slice(0, -1), updated] }
    : { ...evening, deciders: [...evening.deciders.slice(0, -1), updated] }
}

/** A dart for whoever is at the board. Ignored when nobody can throw. */
export function addDart(evening: Evening, dart: Dart, by: ThrownDart['by']): Evening {
  return withActiveTurns(evening, (turns, record) => {
    const current = evaluateRecord(record).current
    if (!current || current.dartsLeft <= 0) return turns
    const open = turns.at(-1)
    if (open && !open.done) {
      return [...turns.slice(0, -1), { ...open, darts: [...open.darts, { dart, by }] }]
    }
    return [...turns, { darts: [{ dart, by }], done: false }]
  })
}

/**
 * The darts were pulled out. Ends the turn if darts were thrown in it; a
 * takeout at an empty board is not a turn.
 */
export function dartsRemoved(evening: Evening): Evening {
  return withActiveTurns(evening, (turns) => {
    const open = turns.at(-1)
    if (!open || open.done || open.darts.length === 0) return turns
    return [...turns.slice(0, -1), { ...open, done: true }]
  })
}

/** "Next player" on the control panel: ends the turn, thrown or not. */
export function nextPlayer(evening: Evening): Evening {
  return withActiveTurns(evening, (turns, record) => {
    if (!evaluateRecord(record).current) return turns
    const open = turns.at(-1)
    if (open && !open.done) return [...turns.slice(0, -1), { ...open, done: true }]
    return [...turns, { darts: [], done: true }]
  })
}

/** Replaces one dart of the current game. Everything after is recounted. */
export function correctDart(
  evening: Evening,
  turnIndex: number,
  dartIndex: number,
  dart: Dart,
): Evening {
  return withActiveTurns(evening, (turns) => {
    const turn = turns[turnIndex]
    if (!turn || !turn.darts[dartIndex]) return turns
    const darts = turn.darts.map((old, i) => (i === dartIndex ? { dart, by: 'hand' as const } : old))
    return turns.map((old, i) => (i === turnIndex ? { ...old, darts } : old))
  })
}

/** Takes back the last dart of the turn in progress. */
export function removeLastDart(evening: Evening): Evening {
  return withActiveTurns(evening, (turns) => {
    const open = turns.at(-1)
    if (!open || open.done || open.darts.length === 0) return turns
    return [...turns.slice(0, -1), { ...open, darts: open.darts.slice(0, -1) }]
  })
}

/**
 * The darts of this turn were edited inside Autodarts. The board's darts
 * are replaced by the new list; darts entered by hand stay, after them.
 */
function throwsCorrected(evening: Evening, throws: readonly Dart[]): Evening {
  return withActiveTurns(evening, (turns, record) => {
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

/** What an event from the board means for the evening. */
export function applyBoardEvent(evening: Evening, event: BoardEvent): Evening {
  switch (event.type) {
    case 'dartThrown':
      return addDart(evening, event.dart, 'board')
    case 'dartsRemoved':
      return dartsRemoved(evening)
    case 'throwsCorrected':
      return throwsCorrected(evening, event.throws)
    default:
      // A reset, a stuck board or a lost connection changes no score.
      return evening
  }
}
