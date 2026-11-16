import { BULL } from '../board/ring'
import type { Dart } from '../board/state'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Blackjack: get as close to 21 as you can without going over. Only the
// number of the segment counts, the ring does not. The bull is the ace: 11,
// or 1 when 11 would take the hand over 21. Pulling your darts is standing.
// Per round the closest hand gets 3 points, the second 2, the third 1, and
// exactly 21 pays 1 on top.

export const BLACKJACK = 21

/** Points for the first three places of a round. */
const PLACE_POINTS = [3, 2, 1]

/** On top of the place, for a hand of exactly 21. */
const BLACKJACK_BONUS = 1

export interface Hand {
  total: number
  bust: boolean
}

export interface BlackjackView {
  scores: Record<PlayerId, number>
  /** The hands of the round being played, or of the last one when over; absent until a player's turn starts. */
  hands: Record<PlayerId, Hand>
  /** The round before the one being played: every hand and what it paid. Null in the first round. */
  previous: Record<PlayerId, Hand & { points: number }> | null
  /**
   * The hand that lies on the table: of whoever threw last, so a bust, and
   * the hand that closed a round, stay in view until the next player
   * throws. Null before the first dart of the game. A card is what its
   * dart added: 11 for a bull, 0 for a dart off the board. `turn` tells
   * one hand from the next.
   */
  table: (Hand & { player: PlayerId; cards: number[]; turn: number }) | null
  /** The best hand of this round that is no longer being thrown at, and who holds it. */
  toBeat: { total: number; players: PlayerId[] } | null
}

/** What a dart is worth in a hand: its segment, 11 for the bull, 0 off the board. */
export function cardValue(dart: Dart): number {
  if (dart.miss || dart.number === null) return 0
  return dart.number === BULL ? 11 : dart.number
}

/** The best total of these darts: every ace counts 11 until that would bust. */
export function handOf(darts: readonly Dart[]): Hand {
  let total = 0
  let aces = 0
  for (const dart of darts) {
    total += cardValue(dart)
    if (cardValue(dart) === 11) aces++
  }
  for (; total > BLACKJACK && aces > 0; aces--) total -= 10
  return { total, bust: total > BLACKJACK }
}

/** A hand counts in its round when it is not bust and has a dart on the board. */
const counts = (hand: Hand): boolean => !hand.bust && hand.total > 0

/** What the hands of one finished round pay. */
export function roundPoints(hands: ReadonlyMap<PlayerId, Hand>): Record<PlayerId, number> {
  const valid = [...hands].filter(([, hand]) => counts(hand)).map(([player]) => player)
  const points: Record<PlayerId, number> = {}
  let place = 0
  // Equal hands share a place, as in the standings.
  for (const group of rankByScore(valid, (player) => hands.get(player)!.total)) {
    for (const player of group) {
      const bonus = hands.get(player)!.total === BLACKJACK ? BLACKJACK_BONUS : 0
      points[player] = (PLACE_POINTS[place] ?? 0) + bonus
    }
    place += group.length
  }
  return points
}

export const blackjack: GameRules<null, BlackjackView> = {
  id: 'blackjack',
  dartsPerTurn: 3,
  maxRounds: 5,

  setup: () => null,

  evaluate(_setup, players, turns) {
    const count = players.length
    // The last thrower knows what to beat, so the start moves up one seat every round.
    const throwerOf = (turnIndex: number): PlayerId =>
      players[(Math.floor(turnIndex / count) + turnIndex) % count]!
    /** Per round, the hand of everyone whose turn has started. */
    const rounds: Map<PlayerId, Hand>[] = []
    let table: BlackjackView['table'] = null

    const progress = playTurns(
      blackjack,
      players,
      turns,
      (dart, thrower, turnIndex, dartIndex, emit) => {
        const round = (rounds[Math.floor(turnIndex / count)] ??= new Map())
        const darts = turns[turnIndex]!.darts.slice(0, dartIndex + 1).map((thrown) => thrown.dart)
        const hand = handOf(darts)
        round.set(thrower, hand)
        table = { ...hand, player: thrower, cards: darts.map(cardValue), turn: turnIndex }
        if (hand.bust) {
          emit({ kind: 'blank', player: thrower })
          return { feedback: 'bad', endTurn: true }
        }
        // Nothing left to throw for.
        if (hand.total === BLACKJACK) return { feedback: 'great', endTurn: true }
        return cardValue(dart) === 0 ? 'bad' : 'good'
      },
      throwerOf,
    )

    const scores: Record<PlayerId, number> = {}
    for (const player of players) scores[player] = 0
    // A round only pays out once everyone has thrown in it.
    const finishedRounds = progress.current ? progress.current.round - 1 : blackjack.maxRounds
    const handsOf = (round: number): Map<PlayerId, Hand> => {
      const hands = new Map(rounds[round])
      // A turn passed on by hand without a dart is an empty hand.
      for (const player of players) if (!hands.has(player)) hands.set(player, { total: 0, bust: false })
      return hands
    }
    const paid: Record<PlayerId, number>[] = []
    for (let round = 0; round < finishedRounds; round++) {
      paid[round] = roundPoints(handsOf(round))
      for (const [player, points] of Object.entries(paid[round]!)) scores[player]! += points
    }

    const round = (progress.current?.round ?? blackjack.maxRounds) - 1
    const hands = Object.fromEntries(progress.finished ? handsOf(round) : (rounds[round] ?? []))
    const previous =
      round === 0 || progress.finished
        ? null
        : Object.fromEntries(
            [...handsOf(round - 1)].map(([player, hand]) => [player, { ...hand, points: paid[round - 1]![player] ?? 0 }]),
          )
    // Whoever is at the board is still throwing; their hand is not yet one to beat.
    const standing = Object.entries(hands).filter(
      ([player, hand]) => counts(hand) && player !== progress.current?.player,
    )
    const best = Math.max(0, ...standing.map(([, hand]) => hand.total))
    const toBeat =
      best > 0 ? { total: best, players: standing.filter(([, hand]) => hand.total === best).map(([player]) => player) } : null

    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores, hands, previous, toBeat, table },
    }
  },
}
