import { RING } from '../board/ring'
import { shuffle } from '../random'
import { halved, playTurns, rankByScore, settledForThrower, type GameRules, type PlayerId } from './types'

// Minefield: under the twenty segments lie treasures and bombs. Nobody knows
// where until a dart lands there. The first to hit a segment gets what is
// under it; after that the segment is empty and safe.

export type Hidden = 'chest' | 'coin' | 'bomb' | 'empty'

/** What lies under the segments, in total twenty. */
export const MINEFIELD_CONTENTS: Record<Hidden, number> = { chest: 3, coin: 5, bomb: 4, empty: 8 }

export const TREASURE_VALUE = { chest: 5, coin: 2 } as const

export interface MinefieldSetup {
  under: Record<number, Hidden>
}

export interface MinefieldView {
  scores: Record<PlayerId, number>
  /** What was found under the segments hit so far. */
  revealed: Record<number, Hidden>
  /** How much is still hidden, of each kind. */
  left: Record<Hidden, number>
  /** Who dug up a bomb and has not started a new turn since. */
  scorched: PlayerId[]
}

export const minefield: GameRules<MinefieldSetup, MinefieldView> = {
  id: 'minefield',
  dartsPerTurn: 3,
  maxRounds: 6,

  setup(_players, random) {
    const contents = (Object.keys(MINEFIELD_CONTENTS) as Hidden[]).flatMap((kind) =>
      Array.from({ length: MINEFIELD_CONTENTS[kind] }, () => kind),
    )
    const shuffled = shuffle(random, contents)
    const under: MinefieldSetup['under'] = {}
    RING.forEach((segment, index) => (under[segment] = shuffled[index]!))
    return { under }
  },

  evaluate(setup, players, turns) {
    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    const revealed: Record<number, Hidden> = {}
    // Counted from this field, not assumed: what is still hidden.
    const left: Record<Hidden, number> = { chest: 0, coin: 0, bomb: 0, empty: 0 }
    for (const hidden of Object.values(setup.under)) left[hidden] += 1

    /** The turn in which each player last dug up a bomb. */
    const bombTurn = new Map<PlayerId, number>()

    const progress = playTurns(minefield, players, turns, (dart, thrower, turnIndex, _index, emit) => {
      if (bombTurn.get(thrower) !== turnIndex) bombTurn.delete(thrower)
      if (dart.miss || dart.number === null) return 'bad'
      const hidden = setup.under[dart.number]
      // The bull, or a segment that was already dug up.
      if (hidden === undefined || revealed[dart.number] !== undefined) return 'neutral'
      revealed[dart.number] = hidden
      left[hidden] -= 1
      emit({ kind: 'dug', player: thrower, segment: dart.number, found: hidden })
      if (hidden === 'empty') return 'neutral'
      if (hidden === 'bomb') {
        bombTurn.set(thrower, turnIndex)
        emit({ kind: 'exploded', player: thrower })
        const half = Math.floor(scores[thrower]! / 2)
        scores[thrower]! -= half
        if (half > 0) emit({ kind: 'lost', player: thrower, amount: half })
        return 'bad'
      }
      scores[thrower]! += TREASURE_VALUE[hidden]
      emit({ kind: 'scored', player: thrower, amount: TREASURE_VALUE[hidden] })
      const feedback = hidden === 'chest' ? 'great' : 'good'
      // With every treasure found there is nothing left to play for.
      return left.chest + left.coin === 0 ? { feedback, finish: true } : feedback
    }, {
      // From a bomb with every dart to the best treasure still hidden with every dart.
      settled: (thrower, darts) => {
        const now = scores[thrower]!
        const best = left.chest > 0 ? TREASURE_VALUE.chest : left.coin > 0 ? TREASURE_VALUE.coin : 0
        return settledForThrower(players, scores, thrower, halved(now, Math.min(darts, left.bomb)), now + best * darts)
      },
    })

    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: {
        scores,
        revealed,
        left,
        // Back at the board for a new turn: the soot is gone.
        scorched: [...bombTurn]
          .filter(([player, turn]) => !(progress.current?.player === player && progress.current.turn !== turn))
          .map(([player]) => player),
      },
    }
  },
}
