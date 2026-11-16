import { neighbour, RING } from '../board/ring'
import { pick, randomInt } from '../random'
import { LIVES, type KnockoutView } from './lastOneStanding'
import { playKnockout, rankKnockout, roundsWithin, type GameRules, type PlayerId } from './types'

// Time Bomb: a bomb with a hidden fuse goes round. At the board you hold it.
// Hit the target and you are rid of it: your turn ends safely. Every other
// dart burns the fuse, and when it runs out the bomb goes off in your hands
// and costs a life. The fuse is counted in darts, not seconds, so walking to
// the board costs nothing.
//
// The target zone follows the players. A round in which most of them got
// rid of the bomb was too easy, so the zone is a segment smaller in the
// next round; a round in which few did makes it a segment bigger again.
// It only changes between rounds, so everyone in a round throws at a zone
// of the same size, and it follows from the darts alone, so a corrected
// dart corrects it too.

const SHORTEST_FUSE = 4
const LONGEST_FUSE = 10

export interface TimeBombSetup {
  /** The fuse of each bomb in turn: how many darts it survives. */
  fuses: number[]
  /** The middle of the target zone for each turn. */
  targets: number[]
}

/** How many segments the target zone is wide, from the easiest level to the hardest. */
export const ZONE_WIDTHS = [3, 2, 1]

/** Above this share of turns that passed the bomb on, a round was too easy. */
export const TOO_EASY = 2 / 3
/** Below this share it was too hard. */
export const TOO_HARD = 1 / 3

export interface TimeBombView extends KnockoutView {
  /** The segments that pass the bomb on this turn: a segment and, while the zone is wide, its neighbours. */
  target: number[]
  /** How hard the round being played is: an index into `ZONE_WIDTHS`, 0 the easiest. */
  level: number
  /** Darts burned on the bomb now going round. How many it has left is secret. */
  burned: number
  /** How many bombs have gone off. */
  explosions: number
  /** Whose bomb went off and who has not been back at the board since. */
  scorched: PlayerId[]
}

/**
 * The segments that count as the target around `middle`: three wide it has
 * both neighbours, two wide only the next one clockwise, one wide none.
 */
export function targetZone(middle: number, width = 3): number[] {
  if (width >= 3) return [neighbour(middle, -1), middle, neighbour(middle, 1)]
  return width === 2 ? [middle, neighbour(middle, 1)] : [middle]
}

/** The level of the round after one played at `level` in which `passes` of `turns` turns passed the bomb on. */
export function nextLevel(level: number, passes: number, turns: number): number {
  if (turns === 0) return level
  const share = passes / turns
  if (share > TOO_EASY) return Math.min(ZONE_WIDTHS.length - 1, level + 1)
  if (share < TOO_HARD) return Math.max(0, level - 1)
  return level
}

export const timeBomb: GameRules<TimeBombSetup, TimeBombView> = {
  id: 'timeBomb',
  dartsPerTurn: 3,
  maxRounds: 10,
  // With many players nobody runs out of lives before the limit, so the
  // limit is the real end: keep it to about 48 turns, which are often short.
  roundsFor: roundsWithin(48, 10),
  emptyTurnsAreNormal: true,

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
    // Per round: the turns in which a dart was thrown, and how many of them passed the bomb on.
    const rounds: { turns: Set<number>; passes: number }[] = []
    const tally = (round: number): { turns: Set<number>; passes: number } =>
      (rounds[round] ??= { turns: new Set(), passes: 0 })
    /** The first round is the easiest; each next one answers to the round before it. */
    const levelOf = (round: number): number => {
      let level = 0
      for (let r = 1; r < round; r++) level = nextLevel(level, tally(r).passes, tally(r).turns.size)
      return level
    }
    const zone = (turnIndex: number, round: number): number[] =>
      targetZone(setup.targets[turnIndex % setup.targets.length]!, ZONE_WIDTHS[levelOf(round)])
    let lastRound = 1

    const progress = playKnockout(
      timeBomb,
      players,
      turns,
      (player) => lives[player]! <= 0,
      (dart, thrower, turnIndex, _index, emit, round) => {
        scorched.delete(thrower)
        lastRound = round
        tally(round).turns.add(turnIndex)
        if (!dart.miss && dart.number !== null && zone(turnIndex, round).includes(dart.number)) {
          tally(round).passes++
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
        target: zone(progress.current?.turn ?? Math.max(0, turns.length - 1), progress.current?.round ?? lastRound),
        level: levelOf(progress.current?.round ?? lastRound),
        burned,
        explosions,
        scorched: [...scorched].filter((player) => player !== progress.current?.player),
      },
    }
  },
}
