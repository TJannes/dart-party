import type { Dart } from '../board/state'
import type { Random } from '../random'

export type PlayerId = string

/** A dart in a turn, and whether the board saw it or someone typed it in. */
export interface ThrownDart {
  dart: Dart
  by: 'board' | 'hand'
}

export interface Turn {
  darts: ThrownDart[]
  /** True once the darts are pulled or the turn was passed on by hand. */
  done: boolean
}

/**
 * Finishing places, best first. Players who tie share a group:
 * [['ann'], ['bob', 'cy'], ['di']] is first, shared second, fourth.
 */
export type Ranking = PlayerId[][]

/**
 * What one dart did, for sound and for how the thrower feels: 'great' and
 * 'good' helped the thrower, 'attack' hurt someone else, 'bad' hurt the
 * thrower, 'neutral' did nothing.
 */
export type DartFeedback = 'great' | 'good' | 'attack' | 'neutral' | 'bad'

/**
 * What a dart did and to whom, for the windows to animate and to make
 * sound with. Pure data: a moment never changes a score, it only reports
 * what the rules already decided.
 */
export type Moment =
  /** Points, steps or plots gained. */
  | { kind: 'scored'; player: PlayerId; amount: number }
  /** Points lost. */
  | { kind: 'lost'; player: PlayerId; amount: number }
  /** `by` hurt `victim`: steps pushed back, hits on a wall, lives taken. */
  | { kind: 'attacked'; by: PlayerId; victim: PlayerId; amount: number }
  | { kind: 'lifeLost'; player: PlayerId; amount: number; left: number }
  | { kind: 'knockedOut'; player: PlayerId }

export type Emit = (moment: Moment) => void

/** A dart that counted: where it sits in the turns, and what it caused. */
export interface PlayedDart {
  turn: number
  index: number
  thrower: PlayerId
  moments: Moment[]
}

/** The ordinary darts feats a game can call spectacular. */
export type ScoreFeat = 'bullseye' | 'triple20' | 'oneEighty'

export interface GameState<View> {
  /** Everything the scene needs to draw this game. */
  view: View
  finished: boolean
  /**
   * Who is at the board, and which turn (an index into the list of turns)
   * their next dart belongs to. Null once the game is finished.
   */
  current: { player: PlayerId; round: number; dartsLeft: number; turn: number } | null
  /** Final when finished, provisional before. */
  ranking: Ranking
  /** One entry per dart that counted, in throwing order. */
  feedback: DartFeedback[]
  /** Who threw each turn played so far, in order. */
  throwers: PlayerId[]
  /** One entry per dart that counted, alongside `feedback`. */
  played: PlayedDart[]
}

/** What the header calls a round, when a game has its own word for it. */
export interface WithOpenings {
  opening: number
  openings: number
}

/**
 * The rules of one mini-game. The state is always worked out from scratch
 * from the full list of turns, so correcting any dart is just a recount.
 */
export interface GameRules<Setup = unknown, View = unknown> {
  id: string
  dartsPerTurn: number
  /** Infinity for a free-play game that lasts until someone finishes. */
  maxRounds: number
  /**
   * Which ordinary darts feats are something special in this game. Three
   * darts in one segment and three misses in a turn always are.
   */
  feats?: readonly ScoreFeat[]
  /** Whatever is decided by chance before the first dart. */
  setup(players: readonly PlayerId[], random: Random): Setup
  /** `players` is the throwing order. */
  evaluate(setup: Setup, players: readonly PlayerId[], turns: readonly Turn[]): GameState<View>
}

/** How far a game has got: everything in its state but the view and the ranking. */
export type Progress = Pick<GameState<unknown>, 'finished' | 'current' | 'feedback' | 'throwers' | 'played'>

/** Groups players by a score, highest first; equal scores tie. */
export function rankByScore(players: readonly PlayerId[], score: (p: PlayerId) => number): Ranking {
  const sorted = [...players].sort((a, b) => score(b) - score(a))
  const ranking: Ranking = []
  for (const player of sorted) {
    const group = ranking.at(-1)
    if (group && score(group[0]!) === score(player)) group.push(player)
    else ranking.push([player])
  }
  return ranking
}

/**
 * Walks the turns in order for a game where players simply take turns.
 * `onDart` says what the dart did, and may end the game at once, or end
 * the turn while its darts are still in the board (a bust). Darts
 * beyond the allowed number in a turn, and turns beyond the last round, are
 * ignored. The game is over as soon as the last dart of the last turn is
 * thrown.
 */
export function playTurns(
  rules: Pick<GameRules, 'dartsPerTurn' | 'maxRounds'>,
  players: readonly PlayerId[],
  turns: readonly Turn[],
  onDart: (
    dart: Dart,
    thrower: PlayerId,
    turnIndex: number,
    dartIndex: number,
    emit: Emit,
  ) => DartFeedback | { feedback: DartFeedback; finish: true } | { feedback: DartFeedback; endTurn: true },
): Progress {
  const maxTurns = rules.maxRounds * players.length
  const feedback: DartFeedback[] = []
  const throwers: PlayerId[] = []
  const played: PlayedDart[] = []
  let index = 0
  for (; index < turns.length && index < maxTurns; index++) {
    const turn = turns[index]!
    const thrower = players[index % players.length]!
    throwers.push(thrower)
    const darts = turn.darts.slice(0, rules.dartsPerTurn)
    let ended = false
    for (let d = 0; d < darts.length && !ended; d++) {
      const moments: Moment[] = []
      const result = onDart(darts[d]!.dart, thrower, index, d, (moment) => moments.push(moment))
      played.push({ turn: index, index: d, thrower, moments })
      if (typeof result === 'string') {
        feedback.push(result)
      } else if ('endTurn' in result) {
        feedback.push(result.feedback)
        ended = true
      } else {
        feedback.push(result.feedback)
        return { finished: true, current: null, feedback, throwers, played }
      }
    }
    // The last turn of the game needs no takeout to count as over.
    const lastDart = index === maxTurns - 1 && darts.length >= rules.dartsPerTurn
    if (!ended && !turn.done && !lastDart) {
      return {
        finished: false,
        current: {
          player: thrower,
          round: Math.floor(index / players.length) + 1,
          dartsLeft: rules.dartsPerTurn - darts.length,
          turn: index,
        },
        feedback,
        throwers,
        played,
      }
    }
  }
  if (index >= maxTurns) return { finished: true, current: null, feedback, throwers, played }
  return {
    finished: false,
    current: {
      player: players[index % players.length]!,
      round: Math.floor(index / players.length) + 1,
      dartsLeft: rules.dartsPerTurn,
      turn: index,
    },
    feedback,
    throwers,
    played,
  }
}

/**
 * Walks the turns of a game in which players drop out. Players still take
 * turns in order, but anyone who is out is skipped, and the game is over
 * when one player is left or the last round has been played.
 *
 * `onDart` may end the thrower's turn early; a thrower who goes out mid-turn
 * is done at once. A turn ended that way may still be open (the darts are
 * in the board): the next dart then starts the next player's turn.
 */
export function playKnockout(
  rules: Pick<GameRules, 'dartsPerTurn' | 'maxRounds'>,
  players: readonly PlayerId[],
  turns: readonly Turn[],
  isOut: (player: PlayerId) => boolean,
  onDart: (
    dart: Dart,
    thrower: PlayerId,
    turnIndex: number,
    dartIndex: number,
    emit: Emit,
  ) => DartFeedback | { feedback: DartFeedback; endTurn: true },
): Progress {
  const feedback: DartFeedback[] = []
  const throwers: PlayerId[] = []
  const played: PlayedDart[] = []
  const over = (): Progress => ({ finished: true, current: null, feedback, throwers, played })
  const standing = (): number => players.filter((player) => !isOut(player)).length
  let seat = -1
  let round = 1

  for (let index = 0; ; index++) {
    if (standing() <= 1) return over()
    // The next player who is still in; passing the end of the order starts a round.
    let step = 1
    while (isOut(players[(seat + step) % players.length]!)) step++
    if (seat >= 0 && seat + step >= players.length) round++
    seat = (seat + step) % players.length
    if (round > rules.maxRounds) return over()
    const thrower = players[seat]!

    const turn = turns[index]
    if (!turn) {
      return {
        finished: false,
        current: { player: thrower, round, dartsLeft: rules.dartsPerTurn, turn: index },
        feedback,
        throwers,
        played,
      }
    }
    throwers.push(thrower)
    const darts = turn.darts.slice(0, rules.dartsPerTurn)
    let ended = false
    for (let d = 0; d < darts.length && !ended; d++) {
      const moments: Moment[] = []
      const result = onDart(darts[d]!.dart, thrower, index, d, (moment) => moments.push(moment))
      played.push({ turn: index, index: d, thrower, moments })
      feedback.push(typeof result === 'string' ? result : result.feedback)
      ended = typeof result !== 'string' || isOut(thrower) || standing() <= 1
    }
    if (!ended && !turn.done) {
      return {
        finished: false,
        current: { player: thrower, round, dartsLeft: rules.dartsPerTurn - darts.length, turn: index },
        feedback,
        throwers,
        played,
      }
    }
  }
}

/**
 * The ranking of a knockout game: whoever lasted longest first. Players
 * still in are ranked by their lives; players who are out by when they went.
 */
export function rankKnockout(
  players: readonly PlayerId[],
  lives: Record<PlayerId, number>,
  outOrder: readonly PlayerId[],
): Ranking {
  return rankByScore(players, (player) => {
    const out = outOrder.indexOf(player)
    return out < 0 ? 1000 + lives[player]! : out
  })
}
