import { RING } from '../board/ring'
import { shuffle } from '../random'
import { playKnockout, rankKnockout, type GameRules, type PlayerId } from './types'

// Last One Standing: everyone has three lives and one segment. Hit someone's
// segment and they lose a life; a double takes two, a triple three. Your own
// segment costs you just the same. Out of lives is out of the game.

export const LIVES = 3

export interface LastOneStandingSetup {
  /** Each player's segment, as a list of one so it reads like Race. */
  segments: Record<PlayerId, [number]>
}

export interface KnockoutView {
  lives: Record<PlayerId, number>
  /** Who is out, first out first. */
  out: PlayerId[]
}

export interface LastOneStandingView extends KnockoutView {
  segments: Record<PlayerId, [number]>
}

export const lastOneStanding: GameRules<LastOneStandingSetup, LastOneStandingView> = {
  id: 'lastOneStanding',
  dartsPerTurn: 3,
  maxRounds: 10,
  emptyTurnsAreNormal: true,

  setup(players, random) {
    const dealt = shuffle(random, RING)
    const segments: LastOneStandingSetup['segments'] = {}
    players.forEach((player, i) => (segments[player] = [dealt[i]!]))
    return { segments }
  },

  evaluate(setup, players, turns) {
    const lives: Record<PlayerId, number> = {}
    const owner = new Map<number, PlayerId>()
    for (const player of players) {
      lives[player] = LIVES
      owner.set(setup.segments[player]![0], player)
    }
    const out: PlayerId[] = []

    const progress = playKnockout(
      lastOneStanding,
      players,
      turns,
      (player) => lives[player]! <= 0,
      (dart, thrower, _turn, _index, emit) => {
        if (dart.miss || dart.number === null) return 'bad'
        const hit = owner.get(dart.number)
        // Nobody's segment, or the segment of someone already out.
        if (hit === undefined || lives[hit]! <= 0) return 'neutral'
        const taken = Math.min(lives[hit]!, dart.multiplier)
        lives[hit]! -= taken
        // Your own segment too: the glove turns round.
        emit({ kind: 'attacked', by: thrower, victim: hit, amount: taken })
        emit({ kind: 'lifeLost', player: hit, amount: taken, left: lives[hit]! })
        if (lives[hit] === 0) {
          out.push(hit)
          emit({ kind: 'knockedOut', player: hit })
          const standing = players.filter((player) => lives[player]! > 0)
          if (standing.length === 2) emit({ kind: 'finalDuel', players: [standing[0]!, standing[1]!] })
        }
        if (hit === thrower) return 'bad'
        return lives[hit] === 0 ? 'great' : 'attack'
      },
    )

    return {
      ...progress,
      ranking: rankKnockout(players, lives, out),
      view: { lives, out, segments: setup.segments },
    }
  },
}
