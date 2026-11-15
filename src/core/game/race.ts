import { RING } from '../board/ring'
import { randomInt, shuffle } from '../random'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Race: everyone owns two adjacent segments. Hit your own to move forward,
// hit someone else's to push them back. First across the finish wins.

export const RACE_TRACK_LENGTH = 10

export interface RaceSetup {
  /** The two adjacent segments each player owns. */
  segments: Record<PlayerId, [number, number]>
}

export interface RaceMove {
  /** Which dart caused it. */
  turn: number
  dart: number
  thrower: PlayerId
  /** Who moved: the thrower (forward) or the owner of the segment (back). */
  player: PlayerId
  from: number
  to: number
}

export interface RaceView {
  segments: Record<PlayerId, [number, number]>
  trackLength: number
  /** Steps from the start, 0 to trackLength. */
  positions: Record<PlayerId, number>
  /** Every move so far, in order, for the scene to animate. */
  moves: RaceMove[]
  winner: PlayerId | null
}

export const race: GameRules<RaceSetup, RaceView> = {
  id: 'race',
  dartsPerTurn: 3,
  maxRounds: 10,

  setup(players, random) {
    // Cut the ring into ten pairs of neighbours, starting at a random
    // segment, and deal a random pair to each player.
    const offset = randomInt(random, RING.length)
    const pairs: [number, number][] = []
    for (let i = 0; i < RING.length; i += 2) {
      pairs.push([RING[(offset + i) % RING.length]!, RING[(offset + i + 1) % RING.length]!])
    }
    if (players.length > pairs.length) throw new Error('Too many players for Race')
    const dealt = shuffle(random, pairs)
    const segments: RaceSetup['segments'] = {}
    players.forEach((player, i) => (segments[player] = dealt[i]!))
    return { segments }
  },

  evaluate(setup, players, turns) {
    const positions: Record<PlayerId, number> = {}
    const owner = new Map<number, PlayerId>()
    for (const player of players) {
      positions[player] = 0
      for (const segment of setup.segments[player] ?? []) owner.set(segment, player)
    }
    const moves: RaceMove[] = []
    let winner: PlayerId | null = null

    const progress = playTurns(race, players, turns, (dart, thrower, turn, dartIndex, emit) => {
      if (dart.miss || dart.number === null) return 'bad'
      const hit = owner.get(dart.number)
      if (hit === undefined) return 'neutral'
      const from = positions[hit]!
      const forward = hit === thrower
      const to = forward
        ? Math.min(RACE_TRACK_LENGTH, from + dart.multiplier)
        : Math.max(0, from - dart.multiplier)
      if (to === from) return 'neutral'
      positions[hit] = to
      moves.push({ turn, dart: dartIndex, thrower, player: hit, from, to })
      if (forward) emit({ kind: 'scored', player: hit, amount: to - from })
      else emit({ kind: 'attacked', by: thrower, victim: hit, amount: from - to })
      const feedback = !forward ? 'attack' : to - from >= 2 ? 'great' : 'good'
      if (to >= RACE_TRACK_LENGTH) {
        winner = hit
        return { feedback, finish: true }
      }
      return feedback
    })

    return {
      ...progress,
      ranking: rankByScore(players, (player) => positions[player]!),
      view: {
        segments: setup.segments,
        trackLength: RACE_TRACK_LENGTH,
        positions,
        moves,
        winner,
      },
    }
  },
}
