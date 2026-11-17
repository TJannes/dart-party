import { BULL } from '../board/ring'
import type { Dart } from '../board/state'
import { randomInt } from '../random'
import { playTurns, rankByScore, type GameRules, type PlayerId } from './types'

// Blackjack: get as close to 21 as you can without going over. Only the
// number of the segment counts, the ring does not. The bull is the ace: 11,
// or 1 when 11 would take the hand over 21. Pulling your darts is standing.
// The house plays last, with cards from the deck: only a hand that equals or
// beats it counts, and every hand that is not bust counts when the house is.
// Per round the closest hand that counts gets 3 points, the second 2, the
// third 1, and exactly 21 pays 1 on top.

export const BLACKJACK = 21

/** Points for the first three places of a round. */
const PLACE_POINTS = [3, 2, 1]

/** On top of the place, for a hand of exactly 21. */
const BLACKJACK_BONUS = 1

/** The house draws until it holds this much, and never more cards than a player has darts. */
export const HOUSE_STANDS = 15
const HOUSE_CARDS = 3

export interface Hand {
  total: number
  bust: boolean
}

/** The cards the house may draw, per round: numbers 1 to 20, as a dart on the board would give. */
export interface BlackjackSetup {
  house: number[][]
}

/** The hand the house played, and the cards it took for it. */
export type HouseHand = Hand & { cards: number[] }

export interface BlackjackView {
  scores: Record<PlayerId, number>
  /** The hands of the round being played, or of the last one when over; absent until a player's turn starts. */
  hands: Record<PlayerId, Hand>
  /** The round before the one being played: every hand and what it paid. Null in the first round. */
  previous: Record<PlayerId, Hand & { points: number }> | null
  /**
   * The hand that lies on the table: of whoever threw last, for as long as
   * those darts are in the board. So a bust, and the hand that closed a
   * round, stay in view until the darts are pulled, and then the table is
   * clear for the next player. Null when no darts are in the board. A
   * card is what its dart dealt: `ACE` for a bull, 0 for a dart off the
   * board. `turn` tells one hand from the next.
   */
  table: (Hand & { player: PlayerId; cards: number[]; turn: number }) | null
  /** The best hand of this round that is no longer being thrown at, and who holds it. */
  toBeat: { total: number; players: PlayerId[] } | null
  /**
   * The house. 'waiting' while a round is being thrown: its card lies face
   * down. Its hand once the round is over, with what that round (counted
   * from 0) paid, until the first dart of the next round. Null in a game
   * without a house (one saved before the house existed).
   */
  house: (HouseHand & { round: number; paid: Record<PlayerId, number> }) | 'waiting' | null
}

/**
 * The ace as a card. Only the bull is one: it counts 11, or 1 when 11
 * would bust. Segment 11 is a plain 11.
 */
export const ACE = BULL

/** The card a dart deals: its segment, the ace for the bull, 0 off the board. */
export function cardValue(dart: Dart): number {
  if (dart.miss || dart.number === null) return 0
  return dart.number
}

/** The best total of these cards: every ace counts 11 until that would bust. */
function handOfCards(cards: readonly number[]): Hand {
  let total = 0
  let aces = 0
  for (const card of cards) {
    total += card === ACE ? 11 : card
    if (card === ACE) aces++
  }
  for (; total > BLACKJACK && aces > 0; aces--) total -= 10
  return { total, bust: total > BLACKJACK }
}

/** The best total of these darts. */
export function handOf(darts: readonly Dart[]): Hand {
  return handOfCards(darts.map(cardValue))
}

/** How the house plays the cards dealt to it: it draws until it holds 15 or more, three cards at most. */
export function houseHand(dealt: readonly number[]): HouseHand {
  const cards: number[] = []
  while (cards.length < Math.min(HOUSE_CARDS, dealt.length) && handOfCards(cards).total < HOUSE_STANDS) {
    cards.push(dealt[cards.length]!)
  }
  return { ...handOfCards(cards), cards }
}

/** A hand counts in its round when it is not bust and has a dart on the board. */
const counts = (hand: Hand): boolean => !hand.bust && hand.total > 0

/** What the hands of one finished round pay, against the house if there is one. */
export function roundPoints(hands: ReadonlyMap<PlayerId, Hand>, house: Hand | null = null): Record<PlayerId, number> {
  // Equal to the house is enough; a house that is bust beats nobody.
  const beatsHouse = (hand: Hand): boolean => !house || house.bust || hand.total >= house.total
  const valid = [...hands].filter(([, hand]) => counts(hand) && beatsHouse(hand)).map(([player]) => player)
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

export const blackjack: GameRules<BlackjackSetup | null, BlackjackView> = {
  id: 'blackjack',
  dartsPerTurn: 3,
  maxRounds: 5,

  setup: (_players, random) => ({
    house: Array.from({ length: blackjack.maxRounds }, () =>
      Array.from({ length: HOUSE_CARDS }, () => 1 + randomInt(random, 20)),
    ),
  }),

  evaluate(setup, players, turns) {
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
    const houseOf = (round: number): HouseHand | null => {
      const dealt = setup?.house[round]
      return dealt ? houseHand(dealt) : null
    }
    const paid: Record<PlayerId, number>[] = []
    for (let round = 0; round < finishedRounds; round++) {
      paid[round] = roundPoints(handsOf(round), houseOf(round))
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

    // The house shows its hand when a round is over, and takes it back at the first dart of the next.
    const closed = houseOf(finishedRounds - 1)
    const untouched = progress.finished || !rounds[round]?.size
    const house: BlackjackView['house'] = !setup
      ? null
      : closed && untouched
        ? { ...closed, round: finishedRounds - 1, paid: paid[finishedRounds - 1]! }
        : 'waiting'

    // Pulling the darts clears the table. (Set inside the walk above, which the compiler does not follow.)
    const lying = table as BlackjackView['table']
    return {
      ...progress,
      ranking: rankByScore(players, (player) => scores[player]!),
      view: { scores, hands, previous, toBeat, house, table: lying && !turns[lying.turn]!.done ? lying : null },
    }
  },
}
