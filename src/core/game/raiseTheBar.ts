import { dartScore } from '../board/ring'
import { rankByScore, type DartFeedback, type GameRules, type PlayedDart, type PlayerId } from './types'

// Raise the Bar: do better than the player before you. An opener throws
// three darts and their total is the bar. The next player must throw more.
// Whoever gets over becomes the holder with a new, higher bar, and the pot
// grows. Whoever fails hands the pot to the holder, and that attempt is
// void: the next opener sets a fresh bar. Everyone opens equally often.

/** How often each player opens: more with few players, so the game has body. */
export function openingsEach(players: number): number {
  return players <= 2 ? 3 : players <= 4 ? 2 : 1
}

export interface RaiseTheBarView {
  scores: Record<PlayerId, number>
  /** Who set the bar that stands now. Null while an opener is throwing. */
  holder: PlayerId | null
  bar: number | null
  /** What the holder wins when the next player fails. */
  pot: number
  /** The total of the turn in progress. */
  thrown: number
  /** Which opening this is, from 1, and how many there are. */
  opening: number
  openings: number
}

export const raiseTheBar: GameRules<null, RaiseTheBarView> = {
  id: 'raiseTheBar',
  dartsPerTurn: 3,
  // An upper bound only; the real length is the number of openings.
  maxRounds: 8,
  feats: ['bullseye', 'triple20', 'oneEighty'],

  setup: () => null,

  evaluate(_setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    const openings = players.length * openingsEach(players.length)
    const feedback: DartFeedback[] = []
    const throwers: PlayerId[] = []
    const played: PlayedDart[] = []

    let opening = 0
    let holder: PlayerId | null = null
    let bar: number | null = null
    let pot = 1
    // The first opener is the first in the throwing order, then the next, ...
    let seat = 0

    const view = (thrown: number): RaiseTheBarView => ({
      scores,
      holder,
      bar,
      pot,
      thrown,
      opening: Math.min(opening + 1, openings),
      openings,
    })
    const state = (finished: boolean, current: { dartsLeft: number; turn: number } | null, thrown = 0) => ({
      finished,
      current: current && { player: players[seat]!, round: opening + 1, ...current },
      feedback,
      throwers,
      played,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: view(thrown),
    })

    for (let index = 0; index < turns.length; index++) {
      const turn = turns[index]!
      const thrower = players[seat]!
      throwers.push(thrower)
      const darts = turn.darts.slice(0, raiseTheBar.dartsPerTurn)
      let total = 0
      for (const [d, { dart }] of darts.entries()) {
        const value = dartScore(dart)
        played.push({ turn: index, index: d, thrower, moments: [] })
        const wasOver = bar !== null && total > bar
        total += value
        const nowOver = bar !== null && total > bar
        feedback.push(value === 0 ? 'bad' : (nowOver && !wasOver) || value >= 40 ? 'great' : 'good')
      }

      // An attempt is settled by its third dart; it need not wait for the takeout.
      const settled = turn.done || darts.length >= raiseTheBar.dartsPerTurn
      if (!settled) {
        return state(false, { dartsLeft: raiseTheBar.dartsPerTurn - darts.length, turn: index }, total)
      }

      if (holder === null) {
        // The opener sets the bar, whatever they threw.
        holder = thrower
        bar = total
        seat = (seat + 1) % players.length
      } else if (total > bar!) {
        played.at(-1)!.moments.push({ kind: 'jump', player: thrower, holder, cleared: true })
        holder = thrower
        bar = total
        pot += 1
        seat = (seat + 1) % players.length
      } else {
        // Not over: the holder takes the pot and the attempt is void.
        if (darts.length > 0) {
          feedback[feedback.length - 1] = 'bad'
          played.at(-1)!.moments.push({ kind: 'jump', player: thrower, holder, cleared: false })
          played.at(-1)!.moments.push({ kind: 'scored', player: holder, amount: pot })
        }
        scores[holder]! += pot
        opening += 1
        holder = null
        bar = null
        pot = 1
        if (opening >= openings) return state(true, null)
        seat = opening % players.length
      }
    }

    return state(false, { dartsLeft: raiseTheBar.dartsPerTurn, turn: turns.length })
  },
}
