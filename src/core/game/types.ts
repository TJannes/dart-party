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

export interface GameState<View> {
  /** Everything the scene needs to draw this game. */
  view: View
  finished: boolean
  /** Who is at the board. Null once the game is finished. */
  current: { player: PlayerId; round: number; dartsLeft: number } | null
  /** Final when finished, provisional before. */
  ranking: Ranking
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
  /** `players` is the throwing order. Turn i belongs to player i mod n. */
  evaluate(setup: Setup, players: readonly PlayerId[], turns: readonly Turn[]): GameState<View>
}

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
 * `onDart` returns true to end the game at once. Darts beyond the allowed
 * number in a turn, and turns beyond the last round, are ignored. The game
 * is over as soon as the last dart of the last turn is thrown.
 */
export function playTurns(
  rules: Pick<GameRules, 'dartsPerTurn' | 'maxRounds'>,
  players: readonly PlayerId[],
  turns: readonly Turn[],
  onDart: (dart: Dart, thrower: PlayerId, turnIndex: number, dartIndex: number) => boolean | void,
): Pick<GameState<unknown>, 'finished' | 'current'> {
  const maxTurns = rules.maxRounds * players.length
  let index = 0
  for (; index < turns.length && index < maxTurns; index++) {
    const turn = turns[index]!
    const thrower = players[index % players.length]!
    const darts = turn.darts.slice(0, rules.dartsPerTurn)
    for (let d = 0; d < darts.length; d++) {
      if (onDart(darts[d]!.dart, thrower, index, d) === true) return { finished: true, current: null }
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
        },
      }
    }
  }
  if (index >= maxTurns) return { finished: true, current: null }
  return {
    finished: false,
    current: {
      player: players[index % players.length]!,
      round: Math.floor(index / players.length) + 1,
      dartsLeft: rules.dartsPerTurn,
    },
  }
}
