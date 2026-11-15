import { dartScore } from '../board/ring'
import type { Dart } from '../board/state'
import { rulesFor } from '../game/registry'
import type { DartFeedback, GameRules, Moment, PlayerId } from '../game/types'
import { activeRecord, evaluateRecord, type Evening, type GameRecord } from './evening'

// What the windows should show and play when the evening changes. Worked
// out by comparing the evening before and after, so nothing plays on resume
// or on undo, and a bug here can never touch a score.

export type Spectacle =
  /** Three darts in one segment. */
  | 'hatTrick'
  | 'bullseye'
  | 'triple20'
  | 'oneEighty'
  | 'threeMisses'
  /** The last dart of the game took the win from someone else. */
  | 'lastDart'

/** One step of the chain a dart sets off, in the order it is shown. */
export type Beat =
  | Moment
  | { kind: 'spectacle'; what: Spectacle; player: PlayerId }
  | { kind: 'won'; players: PlayerId[] }

/** One dart and everything it caused, from cause to effect. */
export interface DartStory {
  /** Which game of the evening: 'g0', 'g1', ... or 'd0' for a deciding round. */
  game: string
  gameId: string
  turn: number
  index: number
  thrower: PlayerId
  dart: Dart
  feedback: DartFeedback
  chain: Beat[]
}

export type Cue =
  /** A dart counted, or a corrected dart got a new outcome. */
  | { kind: 'dart'; story: DartStory; /** Who is up next, if the turn passed with this dart. */ next: PlayerId | null }
  /** The turn passed to another player. */
  | { kind: 'turn'; game: string; player: PlayerId }

/** The order a chain is shown in: cause first, the biggest last. */
const ORDER: Beat['kind'][] = ['scored', 'lost', 'attacked', 'lifeLost', 'knockedOut', 'spectacle', 'won']

/** With one of these in the chain the game is already showing something big. */
const BIG: Beat['kind'][] = ['knockedOut', 'won']

/**
 * The ordinary feat of a dart, given the darts of its turn up to and
 * including it. At most one: the biggest.
 */
export function featOf(rules: Pick<GameRules, 'feats' | 'dartsPerTurn'>, darts: readonly Dart[]): Spectacle | null {
  const dart = darts.at(-1)
  if (!dart) return null
  const feats = rules.feats ?? []
  const full = darts.length === 3 && rules.dartsPerTurn === 3
  if (full && darts.every((d) => d.miss)) return 'threeMisses'
  if (full && feats.includes('oneEighty') && darts.reduce((sum, d) => sum + dartScore(d), 0) === 180) {
    return 'oneEighty'
  }
  if (full && dart.number !== null && darts.every((d) => !d.miss && d.number === dart.number)) return 'hatTrick'
  if (dart.miss || dart.number === null) return null
  if (feats.includes('bullseye') && dart.number === 25 && dart.multiplier === 2) return 'bullseye'
  if (feats.includes('triple20') && dart.number === 20 && dart.multiplier === 3) return 'triple20'
  return null
}

/** The record as it was before its last counted dart. */
function withoutDart(record: GameRecord, turn: number, index: number): GameRecord {
  const turns = record.turns
    .slice(0, turn + 1)
    .map((old, i) => (i === turn ? { darts: old.darts.slice(0, index), done: false } : old))
  return { ...record, turns }
}

/** Every dart of a game that counted, with the chain it set off. */
export function storiesOf(record: GameRecord, game: string): DartStory[] {
  const rules = rulesFor(record.gameId)
  const state = evaluateRecord(record)
  return state.played.map((played, n) => {
    const darts = record.turns[played.turn]!.darts.map((thrown) => thrown.dart)
    const dart = darts[played.index]!
    const chain: Beat[] = [...played.moments]
    const feat = featOf(rules, darts.slice(0, played.index + 1))
    if (feat) chain.push({ kind: 'spectacle', what: feat, player: played.thrower })

    if (state.finished && n === state.played.length - 1) {
      const winners = state.ranking[0] ?? []
      const before = evaluateRecord(withoutDart(record, played.turn, played.index)).ranking[0] ?? []
      // Only a win taken from someone else on the very last dart is a photo finish.
      if (!feat && winners.length === 1 && winners[0] === played.thrower && !before.includes(played.thrower)) {
        chain.push({ kind: 'spectacle', what: 'lastDart', player: played.thrower })
      }
      chain.push({ kind: 'won', players: winners })
    }

    const big = chain.some((beat) => BIG.includes(beat.kind))
    return {
      game,
      gameId: record.gameId,
      turn: played.turn,
      index: played.index,
      thrower: played.thrower,
      dart,
      feedback: state.feedback[n]!,
      chain: chain
        // A general spectacle gives way when the game itself shows something big.
        .filter((beat) => beat.kind !== 'spectacle' || !big || beat.what === 'lastDart')
        .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)),
    }
  })
}

/** A name for the game darts go to right now, or null between games. */
export function activeGameKey(evening: Evening): string | null {
  if (evening.stage === 'playing') return `g${evening.games.length - 1}`
  if (evening.stage === 'decider') return `d${evening.deciders.length - 1}`
  return null
}

const signature = (story: DartStory): string =>
  JSON.stringify([story.turn, story.index, story.dart.name, story.dart.position, story.feedback, story.chain])

/**
 * What to show for the step from one evening to the next. Null when nothing
 * should play: the first look, another game or stage, a dart taken back.
 */
export function cueBetween(before: Evening | null | undefined, after: Evening | null | undefined): Cue | null {
  if (!before || !after) return null
  const game = activeGameKey(after)
  if (game === null || game !== activeGameKey(before)) return null
  const recordBefore = activeRecord(before)!
  const recordAfter = activeRecord(after)!
  if (recordBefore === recordAfter) return null

  const was = storiesOf(recordBefore, game)
  const now = storiesOf(recordAfter, game)
  const playerBefore = evaluateRecord(recordBefore).current?.player ?? null
  const playerAfter = evaluateRecord(recordAfter).current?.player ?? null
  const next = playerAfter !== null && playerAfter !== playerBefore ? playerAfter : null

  if (now.length > was.length) return { kind: 'dart', story: now.at(-1)!, next }
  if (now.length < was.length) return null
  // As many darts as before: one was corrected, or only the turn passed.
  const changed = now.find((story, n) => signature(story) !== signature(was[n]!))
  if (changed) return { kind: 'dart', story: changed, next }
  return next ? { kind: 'turn', game, player: next } : null
}
