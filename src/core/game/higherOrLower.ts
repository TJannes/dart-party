import { dartScore } from '../board/ring'
import { LIVES, type KnockoutView } from './lastOneStanding'
import { playKnockout, rankKnockout, type GameRules, type PlayerId } from './types'

// Higher or Lower: before every dart the game calls "higher" or "lower".
// The dart must be worth more, or less, than the dart before it, whoever
// threw that. Get it wrong and you lose a life. A miss is always wrong.

export type Call = 'higher' | 'lower'

/** From this value up the call is always "lower"; a higher dart is too rare. */
const ALWAYS_LOWER_FROM = 30
/** Up to this value the call is always "higher"; a lower dart is too rare. */
const ALWAYS_HIGHER_UPTO = 5

export interface HigherOrLowerSetup {
  /** A coin flip per dart of the game: true for "higher". */
  flips: boolean[]
}

export interface HigherOrLowerView extends KnockoutView {
  /** The value to beat: the last dart that landed on the board. Null at the start. */
  bar: number | null
  /** What the next dart must be. Null when any dart on the board will do. */
  call: Call | null
}

/** The call for a dart, given the value before it. Never an impossible one. */
export function callFor(bar: number | null, flip: boolean): Call | null {
  if (bar === null) return null
  if (bar >= ALWAYS_LOWER_FROM) return 'lower'
  if (bar <= ALWAYS_HIGHER_UPTO) return 'higher'
  return flip ? 'higher' : 'lower'
}

export const higherOrLower: GameRules<HigherOrLowerSetup, HigherOrLowerView> = {
  id: 'higherOrLower',
  dartsPerTurn: 3,
  maxRounds: 10,

  // Enough flips for eight players throwing three darts for ten rounds.
  setup: (_players, random) => ({ flips: Array.from({ length: 240 }, () => random() < 0.5) }),

  evaluate(setup, players, turns) {
    const lives: Record<PlayerId, number> = {}
    for (const player of players) lives[player] = LIVES
    const out: PlayerId[] = []
    let bar: number | null = null
    let thrown = 0
    const flip = (): boolean => setup.flips[thrown % setup.flips.length] ?? true

    const progress = playKnockout(
      higherOrLower,
      players,
      turns,
      (player) => lives[player]! <= 0,
      (dart, thrower, _turn, _index, emit) => {
        const call = callFor(bar, flip())
        thrown++
        const value = dartScore(dart)
        const right =
          !dart.miss && (call === null || (call === 'higher' ? value > bar! : value < bar!))
        // A miss leaves the bar where it was.
        if (!dart.miss) bar = value
        if (call !== null) emit({ kind: 'call', player: thrower, call, right })
        if (right) return 'good'
        lives[thrower]! -= 1
        emit({ kind: 'lifeLost', player: thrower, amount: 1, left: lives[thrower]! })
        if (lives[thrower] === 0) {
          out.push(thrower)
          emit({ kind: 'knockedOut', player: thrower })
        }
        return 'bad'
      },
    )

    return {
      ...progress,
      ranking: rankKnockout(players, lives, out),
      view: { lives, out, bar, call: callFor(bar, flip()) },
    }
  },
}
