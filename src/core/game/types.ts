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
  maxRounds: number
  /** Whatever is decided by chance before the first dart. */
  setup(players: readonly PlayerId[], random: Random): Setup
  /** `players` is the throwing order. */
  evaluate(setup: Setup, players: readonly PlayerId[], turns: readonly Turn[]): GameState<View>
}

/** How far a game has got: everything in its state but the view and the ranking. */
export type Progress = Pick<GameState<unknown>, 'finished' | 'current' | 'feedback' | 'throwers'>

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
 * `onDart` says what the dart did, and may end the game at once. Darts
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
  ) => DartFeedback | { feedback: DartFeedback; finish: true },
): Progress {
  const maxTurns = rules.maxRounds * players.length
  const feedback: DartFeedback[] = []
  const throwers: PlayerId[] = []
  let index = 0
  for (; index < turns.length && index < maxTurns; index++) {
    const turn = turns[index]!
    const thrower = players[index % players.length]!
    throwers.push(thrower)
    const darts = turn.darts.slice(0, rules.dartsPerTurn)
    for (let d = 0; d < darts.length; d++) {
      const result = onDart(darts[d]!.dart, thrower, index, d)
      if (typeof result === 'string') {
        feedback.push(result)
      } else {
        feedback.push(result.feedback)
        return { finished: true, current: null, feedback, throwers }
      }
    }
    // The last turn of the game needs no takeout to count as over.
    const lastDart = index === maxTurns - 1 && darts.length >= rules.dartsPerTurn
    if (!turn.done && !lastDart) {
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
      }
    }
  }
  if (index >= maxTurns) return { finished: true, current: null, feedback, throwers }
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
  ) => DartFeedback | { feedback: DartFeedback; endTurn: true },
): Progress {
  const feedback: DartFeedback[] = []
  const throwers: PlayerId[] = []
  const over = (): Progress => ({ finished: true, current: null, feedback, throwers })
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
      }
    }
    throwers.push(thrower)
    const darts = turn.darts.slice(0, rules.dartsPerTurn)
    let ended = false
    for (let d = 0; d < darts.length && !ended; d++) {
      const result = onDart(darts[d]!.dart, thrower, index, d)
      feedback.push(typeof result === 'string' ? result : result.feedback)
      ended = typeof result !== 'string' || isOut(thrower) || standing() <= 1
    }
    if (!ended && !turn.done) {
      return {
        finished: false,
        current: { player: thrower, round, dartsLeft: rules.dartsPerTurn - darts.length, turn: index },
        feedback,
        throwers,
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
