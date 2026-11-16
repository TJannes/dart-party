import { BULL, manualDart, manualMiss, placedDart, RING } from '../board/ring'
import type { Dart } from '../board/state'
import type { LastOneStandingSetup } from '../game/lastOneStanding'
import type { RaceSetup } from '../game/race'
import { addDart, dartsRemoved, type GameRecord, type Party, type Player } from './party'

// The demo on the rules card: a few darts of the drawn game, played through
// the real rules by the players of the party, so what the card shows is what
// the game does. It is a party of its own that is never saved; nothing here
// touches the real one.

/** One dart of the demo: the little game before it and after it. */
export interface DemoStep {
  before: Party
  after: Party
}

interface Move {
  /** What happens first, with nothing to see: darts thrown, or the darts pulled so the turn passes. */
  before?: (Dart | 'pull')[]
  dart: Dart
  /** The darts are pulled straight after it, for a game that only pays out when the turn has passed. */
  pulled?: boolean
}

interface Script {
  /**
   * What chance decided in the demo. Dealt segments are the party's own;
   * what a game keeps hidden (mines, the fuse, the targets) is made up
   * here, so a demo never gives the real one away.
   */
  setup: unknown
  /** Two to four darts, one per caption in `strings.games[id].demo`. */
  moves: Move[]
}

const S = (n: number): Dart => manualDart(n, 1)
const D = (n: number): Dart => manualDart(n, 2)
const T = (n: number): Dart => manualDart(n, 3)

/** What lies under these segments in the Minefield demo. */
const at = (kind: string, ...segments: number[]): Record<number, string> =>
  Object.fromEntries(segments.map((segment) => [segment, kind]))

/** The pictures of the Memory demo, clockwise from the 20 and round again. */
const MEMORY_DEMO = ['star', 'heart', 'clover', 'diamond', 'triangle']

/** The cross of the Sniper demo, every round. */
const CROSS = { x: 0.3, y: 0.4 }

const SCRIPTS: Record<string, (record: GameRecord) => Script> = {
  race: (record) => {
    const { segments } = record.setup as RaceSetup
    const own = segments[record.order[0]!]![0]
    return {
      setup: record.setup,
      // Forward, forward faster, then the second player pushes the first back.
      moves: [{ dart: S(own) }, { dart: T(own) }, { before: ['pull'], dart: S(own) }],
    }
  },

  // The three zones, from the middle out.
  robinHood: () => ({
    setup: null,
    moves: [{ dart: manualDart(BULL, 2) }, { dart: manualDart(20, 1, true) }, { dart: S(20) }],
  }),

  // On the target, beside it, and nowhere near.
  spotlight: () => ({
    setup: { targets: [20, 3, 6, 11, 8, 16] },
    moves: [{ dart: S(20) }, { dart: S(1) }, { dart: S(3) }],
  }),

  // Coins, the double ring that pays three times, and the hammer that waits just beyond it.
  piggyBank: () => ({ setup: null, moves: [{ dart: S(20) }, { dart: D(20) }, { dart: manualMiss() }] }),

  // Claimed and fortified by the first player, then taken by the second in three hits.
  landGrab: () => ({
    setup: null,
    moves: [{ dart: S(20) }, { dart: S(20) }, { before: ['pull'], dart: S(20) }, { dart: D(20) }],
  }),

  sniper: (record) => {
    // Everyone after the first throws a full turn, each a little further off; the last dart ends the round.
    const others = record.order.slice(1).flatMap((_, n): (Dart | 'pull')[] => {
      const off = 0.12 * (n + 1)
      return ['pull', placedDart(-0.5, 0.1 + off), placedDart(0.6, -0.2 - off), placedDart(CROSS.x + off, CROSS.y + off)]
    })
    return {
      setup: { targets: Array.from({ length: 5 }, () => CROSS) },
      moves: [
        { dart: placedDart(-0.3, -0.2) },
        { dart: placedDart(0.26, 0.34) },
        // A round pays out once the last darts are pulled.
        { before: [placedDart(0.1, -0.5), ...others.slice(0, -1)], dart: others.at(-1) as Dart, pulled: true },
      ],
    }
  },

  // A chest, a coin and a bomb, in that order, on a field with as much hidden as a real one.
  minefield: () => ({
    setup: {
      under: {
        ...Object.fromEntries(RING.map((segment) => [segment, 'empty'])),
        ...at('chest', 20, 3, 11),
        ...at('coin', 1, 6, 15, 17, 19),
        ...at('bomb', 18, 13, 2, 8),
      },
    },
    moves: [{ dart: S(20) }, { dart: S(1) }, { dart: S(18) }],
  }),

  lastOneStanding: (record) => {
    const { segments } = record.setup as LastOneStandingSetup
    const own = segments[record.order[0]!]![0]
    const theirs = segments[record.order[1]!]![0]
    // A life off the second player, one off the thrower, then the second goes out.
    return { setup: record.setup, moves: [{ dart: S(theirs) }, { dart: S(own) }, { dart: T(theirs) }] }
  },

  // The calls are forced: up to 5 it is always "higher", from 30 always "lower".
  higherOrLower: () => ({
    setup: { flips: Array.from({ length: 240 }, () => true) },
    moves: [{ dart: S(5) }, { dart: T(10) }, { dart: T(20) }],
  }),

  // A fuse of three darts: one burned, the bomb passed on, and it goes off in the next hands.
  timeBomb: () => ({
    setup: { fuses: Array.from({ length: 80 }, () => 3), targets: Array.from({ length: 80 }, () => 20) },
    moves: [{ dart: S(7) }, { dart: S(20) }, { before: ['pull', S(7)], dart: S(7) }],
  }),

  // A bar of 57, raised to 96, then someone who stays under it. Never three darts in one segment or a triple 20, which would fill the screen.
  raiseTheBar: () => ({
    setup: null,
    moves: [
      { before: [S(20), S(19)], dart: S(18) },
      { before: ['pull', S(20), S(19)], dart: T(19) },
      { before: ['pull', S(1), S(2)], dart: S(3) },
    ],
  }),

  // A card, its pair, and a card that will turn back. Made up, so the demo gives nothing away.
  memory: () => ({
    setup: { under: Object.fromEntries(RING.map((segment, index) => [segment, MEMORY_DEMO[index % MEMORY_DEMO.length]])) },
    moves: [{ dart: S(20) }, { dart: S(6) }, { dart: S(1) }],
  }),

  // A triple that counts once, a hand of exactly 21, and the next player going over.
  blackjack: () => ({
    setup: null,
    moves: [{ dart: T(7) }, { dart: S(14) }, { before: [S(20)], dart: S(18) }],
  }),
}

/** The demo of the game in `record`, or null for a game that has none yet. */
export function rulesDemo(record: GameRecord, players: readonly Player[]): DemoStep[] | null {
  const script = SCRIPTS[record.gameId]?.(record)
  if (!script) return null
  let party: Party = {
    players: [...players],
    gamesPlanned: 1,
    enabledGames: [record.gameId],
    stage: 'playing',
    games: [{ gameId: record.gameId, order: record.order, setup: script.setup, turns: [] }],
    deciders: [],
  }
  return script.moves.map((move) => {
    const before = (move.before ?? []).reduce(
      (now, step) => (step === 'pull' ? dartsRemoved(now) : addDart(now, step, 'board')),
      party,
    )
    party = addDart(before, move.dart, 'board')
    if (move.pulled) party = dartsRemoved(party)
    return { before, after: party }
  })
}
