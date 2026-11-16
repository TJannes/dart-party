import { dartScore } from '../board/ring'
import type { Dart } from '../board/state'
import { rulesFor } from '../game/registry'
import type { DartFeedback, GameRules, Moment, PlayerId } from '../game/types'
import { activeRecord, evaluateRecord, type Party, type GameRecord } from './party'

// What the windows should show and play when the party changes. Worked
// out by comparing the party before and after, so nothing plays on resume
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
  /** Which game of the party: 'g0', 'g1', ... or 'd0' for a deciding round. */
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
  | {
      kind: 'dart'
      story: DartStory
      /** Who is up next, if the turn passed with this dart. */
      next: PlayerId | null
      /** The round that starts with that player, if one does. */
      round?: number
      /** Set when that round is harder or easier than the one before it. */
      level?: LevelChange
    }
  /** The turn passed to another player; `round` when that starts a new round. */
  | { kind: 'turn'; game: string; gameId: string; player: PlayerId; round?: number; level?: LevelChange }

/** A game that adapts to its players got harder or easier with a new round. */
export type LevelChange = 'harder' | 'easier'

/** The order a chain is shown in: cause first, the biggest last. */
const ORDER: Beat['kind'][] = [
  'dug',
  'measured',
  'call',
  'scored',
  'lost',
  'fuse',
  'passed',
  'exploded',
  'attacked',
  'fortified',
  'lifeLost',
  'knockedOut',
  'finalDuel',
  'jump',
  'roundResult',
  'blank',
  'spectacle',
  'won',
]

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
    // A dart that hurt its thrower (a bust on a triple 20) is no feat; three misses still are.
    const found = featOf(rules, darts.slice(0, played.index + 1))
    const feat = found !== 'threeMisses' && state.feedback[n] === 'bad' ? null : found
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
    const over = chain.some((beat) => beat.kind === 'won')
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
        // Nobody is left to take the bomb once the game is over.
        .filter((beat) => beat.kind !== 'passed' || !over)
        .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)),
    }
  })
}

/** A name for the game darts go to right now, or null between games. */
export function activeGameKey(party: Party): string | null {
  if (party.stage === 'playing') return `g${party.games.length - 1}`
  if (party.stage === 'decider') return `d${party.deciders.length - 1}`
  return null
}

const signature = (story: DartStory): string =>
  JSON.stringify([story.turn, story.index, story.dart.name, story.dart.position, story.feedback, story.chain])

/**
 * What to show for the step from one party to the next. Null when nothing
 * should play: the first look, another game or stage, a dart taken back.
 */
export function cueBetween(before: Party | null | undefined, after: Party | null | undefined): Cue | null {
  if (!before || !after) return null
  const game = activeGameKey(after)
  if (game === null || game !== activeGameKey(before)) return null
  const recordBefore = activeRecord(before)!
  const recordAfter = activeRecord(after)!
  if (recordBefore === recordAfter) return null

  const was = storiesOf(recordBefore, game)
  const now = storiesOf(recordAfter, game)
  const currentBefore = evaluateRecord(recordBefore).current
  const currentAfter = evaluateRecord(recordAfter).current
  const playerAfter = currentAfter?.player ?? null
  const next = playerAfter !== null && playerAfter !== (currentBefore?.player ?? null) ? playerAfter : null
  const newRound = next !== null && currentBefore && currentAfter!.round > currentBefore.round
  // A game that adapts to its players says how hard the round is as `level` in its view.
  const levelBefore: unknown = evaluateRecord(recordBefore).view?.level
  const levelAfter: unknown = evaluateRecord(recordAfter).view?.level
  const level: { level?: LevelChange } =
    typeof levelBefore === 'number' && typeof levelAfter === 'number' && levelAfter !== levelBefore
      ? { level: levelAfter > levelBefore ? 'harder' : 'easier' }
      : {}
  const round = newRound ? { round: currentAfter!.round, ...level } : {}

  if (now.length > was.length) return { kind: 'dart', story: now.at(-1)!, next, ...round }
  if (now.length < was.length) return null
  // As many darts as before: one was corrected, or only the turn passed.
  const changed = now.find((story, n) => signature(story) !== signature(was[n]!))
  if (changed) return { kind: 'dart', story: changed, next, ...round }
  return next ? { kind: 'turn', game, gameId: recordAfter.gameId, player: next, ...round } : null
}
