import { neighbour, RING } from '../board/ring'
import { pick, randomInt } from '../random'
import { LIVES, type KnockoutView } from './lastOneStanding'
import { playKnockout, rankKnockout, type GameRules, type PlayerId } from './types'

// Time Bomb: a bomb with a hidden fuse goes round. At the board you hold it.
// Hit the target and you are rid of it: your turn ends safely. Every other
// dart burns the fuse, and when it runs out the bomb goes off in your hands
// and costs a life. The fuse is counted in darts, not seconds, so walking to
// the board costs nothing.

const SHORTEST_FUSE = 4
const LONGEST_FUSE = 10

export interface TimeBombSetup {
  /** The fuse of each bomb in turn: how many darts it survives. */
  fuses: number[]
  /** The middle of the target zone for each turn. */
  targets: number[]
}

export interface TimeBombView extends KnockoutView {
  /** The segments that pass the bomb on this turn: a segment and its neighbours. */
  target: number[]
  /** Darts burned on the bomb now going round. How many it has left is secret. */
  burned: number
  /** How many bombs have gone off. */
  explosions: number
  /** Whose bomb went off and who has not been back at the board since. */
  scorched: PlayerId[]
}

/** The three segments that count as the target around `middle`. */
export function targetZone(middle: number): number[] {
  return [neighbour(middle, -1), middle, neighbour(middle, 1)]
}

export const timeBomb: GameRules<TimeBombSetup, TimeBombView> = {
  id: 'timeBomb',
  dartsPerTurn: 3,
  maxRounds: 10,

  setup: (_players, random) => ({
    fuses: Array.from(
      { length: 80 },
      () => SHORTEST_FUSE + randomInt(random, LONGEST_FUSE - SHORTEST_FUSE + 1),
    ),
    targets: Array.from({ length: 80 }, () => pick(random, RING)),
  }),

  evaluate(setup, players, turns) {
    const lives: Record<PlayerId, number> = {}
    for (const player of players) lives[player] = LIVES
    const out: PlayerId[] = []
    let explosions = 0
    let burned = 0
    const scorched = new Set<PlayerId>()
    /** Who gets the bomb after `player`: the next one still in the game. */
    const after = (player: PlayerId): PlayerId | null => {
      const at = players.indexOf(player)
      for (let step = 1; step < players.length; step++) {
        const next = players[(at + step) % players.length]!
        if (lives[next]! > 0) return next
      }
      return null
    }
    const fuse = (): number => setup.fuses[explosions % setup.fuses.length]!
    const zone = (turnIndex: number): number[] =>
      targetZone(setup.targets[turnIndex % setup.targets.length]!)

    const progress = playKnockout(
      timeBomb,
      players,
      turns,
      (player) => lives[player]! <= 0,
      (dart, thrower, turnIndex, _index, emit) => {
        scorched.delete(thrower)
        if (!dart.miss && dart.number !== null && zone(turnIndex).includes(dart.number)) {
          const to = after(thrower)
          if (to !== null) emit({ kind: 'passed', from: thrower, to })
          return { feedback: 'great', endTurn: true }
        }
        burned++
        if (burned < fuse()) {
          emit({ kind: 'fuse', player: thrower, burned })
          return 'neutral'
        }
        // Boom. A new bomb starts with the next player.
        explosions++
        burned = 0
        scorched.add(thrower)
        emit({ kind: 'exploded', player: thrower })
        lives[thrower]! -= 1
        emit({ kind: 'lifeLost', player: thrower, amount: 1, left: lives[thrower]! })
        if (lives[thrower] === 0) {
          out.push(thrower)
          emit({ kind: 'knockedOut', player: thrower })
        }
        return { feedback: 'bad', endTurn: true }
      },
    )

    return {
      ...progress,
      ranking: rankKnockout(players, lives, out),
      view: {
        lives,
        out,
        target: zone(progress.current?.turn ?? Math.max(0, turns.length - 1)),
        burned,
        explosions,
        scorched: [...scorched].filter((player) => player !== progress.current?.player),
      },
    }
  },
}
