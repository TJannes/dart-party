import { boardCondition, sameDart, type BoardState, type Dart } from './state'

export type BoardEvent =
  /** A new dart. `index` is its place in the turn, from 0. */
  | { type: 'dartThrown'; dart: Dart; index: number }
  /** The darts were pulled out: the turn is over. */
  | { type: 'dartsRemoved' }
  /** The darts of this turn were edited inside Autodarts. */
  | { type: 'throwsCorrected'; throws: Dart[] }
  /** The board was reset, by us or in Autodarts. Not the end of a turn. */
  | { type: 'boardReset' }
  /** Darts thrown from now on are lost until the board is reset. */
  | { type: 'boardStuck' }
  | { type: 'detectionStopped' }
  | { type: 'detectionStarted' }
  /** Autodarts cannot be reached. */
  | { type: 'connectionLost' }
  | { type: 'connectionRestored' }
  /** Autodarts answered in a shape this app does not understand. */
  | { type: 'unexpectedData'; message: string }

/**
 * What happened between two states. Autodarts only sends whole states, and
 * its `event` field can lag behind (the first dart of a turn arrives once
 * with a stale event), so darts are recognised by the list of throws.
 *
 * With no previous state only standing conditions are reported: darts that
 * were already in the board are not thrown again.
 */
export function diffStates(previous: BoardState | null, next: BoardState): BoardEvent[] {
  const events: BoardEvent[] = []
  const stuck = boardCondition(next) === 'stuck'

  if (previous === null) {
    if (!next.running) events.push({ type: 'detectionStopped' })
    if (stuck) events.push({ type: 'boardStuck' })
    return events
  }

  if (previous.running !== next.running) {
    events.push({ type: next.running ? 'detectionStarted' : 'detectionStopped' })
  }

  const before = previous.throws
  const after = next.throws
  const unchanged =
    before.length === after.length && before.every((dart, i) => sameDart(dart, after[i]!))
  const resetNow = next.event === 'manualReset'

  if (unchanged) {
    if (resetNow && previous.event !== 'manualReset') events.push({ type: 'boardReset' })
  } else if (after.length > before.length && before.every((dart, i) => sameDart(dart, after[i]!))) {
    for (let index = before.length; index < after.length; index++) {
      events.push({ type: 'dartThrown', dart: after[index]!, index })
    }
  } else if (after.length === 0 && (next.event === 'takeoutFinished' || next.status === 'takeoutInProgress')) {
    // Darts gone. A takeout can also hang with the list already emptied and
    // no takeoutFinished to come; that is the same takeout, not a player
    // deleting every dart inside Autodarts.
    events.push({ type: 'dartsRemoved' })
  } else if (after.length === 0 && resetNow) {
    events.push({ type: 'boardReset' })
  } else {
    events.push({ type: 'throwsCorrected', throws: after })
  }

  if (stuck && boardCondition(previous) !== 'stuck') events.push({ type: 'boardStuck' })
  return events
}
