import type { BoardEvent } from '../board/events'
import { BULL, manualDart, manualMiss, placedDart, RING } from '../board/ring'
import type { Dart } from '../board/state'
import { drawableGames, freePlayGames } from '../game/registry'
import { cleanX01Setup } from '../game/x01'
import type { PlayerId, Ranking } from '../game/types'
import type { Random } from '../random'
import {
  DRINK_RULES,
  drinkTally,
  pickBuddy,
  setDrinkingOn,
  setSitOut,
  spinWheel,
  type DrinkRule,
  type DrinkTally,
} from './drinking'
import {
  activeRecord,
  addDart,
  advance,
  applyBoardEvent,
  correctDart,
  evaluateRecord,
  finalRanking,
  nextPlayer,
  playAgain,
  removeLastDart,
  standings,
  startParty,
  startFreePlay,
  type Party,
  type Player,
} from './party'

// The party as the app runs it: one at a time, saved after every change so
// a crash or restart picks up where it was, and written to the history when
// it is over. Storage is passed in, so this has no Electron in it.

/** A dart as the control panel enters it. */
export type DartInput =
  | { miss: true }
  | { miss?: false; number: number; multiplier: 1 | 2 | 3; /** An inner single. */ inner?: boolean }
  /** Pointed at on the board, in board coordinates. */
  | { position: { x: number; y: number } }

export type PartyCommand =
  /** `drinking` makes it a drinking game; `sitOut` are the players who do not drink. */
  | { type: 'start'; players: Player[]; games: number; drinking?: { sitOut?: PlayerId[] } }
  /** One game on its own. `options` are the game's own, such as X01's start score. */
  | { type: 'startFreePlay'; players: Player[]; game: string; options?: unknown }
  /** The same free-play game once more. */
  | { type: 'playAgain' }
  /** Continue: past the draw, the rules card, a finished game. */
  | { type: 'advance' }
  | { type: 'addDart'; dart: DartInput }
  | { type: 'correctDart'; turn: number; index: number; dart: DartInput }
  | { type: 'removeLastDart' }
  | { type: 'nextPlayer' }
  /** The drinking game off or back on, from now on. */
  | { type: 'setDrinking'; on: boolean }
  /** One player sits out of the drinking, or joins in again. */
  | { type: 'setSitOut'; player: PlayerId; out: boolean }
  | { type: 'spinWheel' }
  | { type: 'pickBuddy'; player: PlayerId }
  /** Stop the party without a result. */
  | { type: 'abort' }
  /** Leave the podium: the result goes to the history. */
  | { type: 'finish' }

/** The result of a finished party, as kept for the hall of fame. */
export interface PartyResult {
  finishedAt: string
  players: Player[]
  ranking: Ranking
  points: Record<PlayerId, number>
  games: string[]
  /** Sips taken and handed out, when it was a drinking game. */
  drinks?: Record<PlayerId, DrinkTally>
}

/** Named JSON documents that survive a restart. */
export interface Store {
  /** Null when there is nothing saved, or it cannot be read. */
  load(name: string): unknown
  save(name: string, data: unknown): void
  remove(name: string): void
}

const PARTY = 'party'
/** Where versions before 0.6.0 kept the party, when it was called an evening. */
const OLD_PARTY = 'evening'
const HISTORY = 'history'
const FORMAT = 1

function toDart(input: DartInput): Dart | null {
  if ('position' in input) {
    const { x, y } = input.position ?? {}
    const sane = (n: unknown): n is number => typeof n === 'number' && Math.abs(n) <= 1.5
    return sane(x) && sane(y) ? placedDart(x, y) : null
  }
  if (input.miss) return manualMiss()
  const { number, multiplier } = input
  const known = RING.includes(number) || (number === BULL && multiplier !== 3)
  if (!known || ![1, 2, 3].includes(multiplier)) return null
  return manualDart(number, multiplier, input.inner === true)
}

/** A saved party is only resumed if every game in it can be recounted. */
function readSavedParty(saved: unknown): Party | null {
  try {
    const { format, party = (saved as { evening?: Party }).evening } = saved as { format?: unknown; party?: Party }
    if (format !== FORMAT || !party) return null
    for (const record of [...party.games, ...party.deciders]) evaluateRecord(record)
    standings(party)
    finalRanking(party)
    return party
  } catch {
    return null
  }
}

export class PartySession {
  private party: Party | null

  constructor(
    private readonly store: Store,
    private readonly random: Random,
    private readonly onChange: (party: Party | null) => void = () => {},
    private readonly now: () => Date = () => new Date(),
    /** The mini-games that may be drawn in a party started now. */
    private readonly games: () => string[] = () => drawableGames.map((game) => game.id),
    /**
     * A game, deciding round or free-play game is about to take its first
     * dart. The app uses it to clear darts Autodarts noted in between.
     */
    private readonly onGameStart: () => void = () => {},
    /** The drinking rules that hold in a drinking game started now. */
    private readonly drinkRules: () => DrinkRule[] = () => [...DRINK_RULES],
  ) {
    this.party = readSavedParty(store.load(PARTY))
    // A party saved by an older version: carry it over under the new name.
    if (!this.party) {
      const old = readSavedParty(store.load(OLD_PARTY))
      if (old) {
        this.party = old
        store.save(PARTY, { format: FORMAT, party: old })
      }
    }
    store.remove(OLD_PARTY)
  }

  get current(): Party | null {
    return this.party
  }

  get history(): PartyResult[] {
    const saved = this.store.load(HISTORY)
    return Array.isArray(saved) ? (saved as PartyResult[]) : []
  }

  boardEvent(event: BoardEvent): void {
    if (this.party) this.set(applyBoardEvent(this.party, event))
  }

  command(command: PartyCommand): void {
    const before = this.party ? activeRecord(this.party) : null
    this.apply(command)
    const after = this.party ? activeRecord(this.party) : null
    // Only these commands begin a game; the others change the one running.
    const begins = command.type === 'startFreePlay' || command.type === 'playAgain' || command.type === 'advance'
    if (begins && after && after !== before) this.onGameStart()
  }

  private apply(command: PartyCommand): void {
    if (command.type === 'start') {
      // Players are fixed once a party starts; abort it first.
      if (this.party) return
      try {
        const ids = command.players.map((p) => p.id)
        const sitOut = command.drinking?.sitOut
        const drinking = command.drinking
          ? { rules: this.drinkRules(), sitOut: Array.isArray(sitOut) ? ids.filter((id) => sitOut.includes(id)) : [] }
          : undefined
        this.set(startParty(command.players, command.games, this.games(), this.random, drinking))
      } catch {
        // Not a valid party: nothing starts.
      }
      return
    }

    if (command.type === 'startFreePlay') {
      if (this.party) return
      try {
        if (!freePlayGames.some((game) => game.id === command.game)) return
        const setup = command.game === 'x01' ? cleanX01Setup(command.options) : null
        this.set(startFreePlay(command.players, command.game, setup))
      } catch {
        // Not a valid game: nothing starts.
      }
      return
    }

    const party = this.party
    if (!party) return
    switch (command.type) {
      case 'playAgain':
        return this.set(playAgain(party))
      case 'advance':
        return this.set(advance(party, this.random))
      case 'addDart': {
        const dart = toDart(command.dart)
        return dart ? this.set(addDart(party, dart, 'hand')) : undefined
      }
      case 'correctDart': {
        const dart = toDart(command.dart)
        return dart ? this.set(correctDart(party, command.turn, command.index, dart)) : undefined
      }
      case 'removeLastDart':
        return this.set(removeLastDart(party))
      case 'nextPlayer':
        return this.set(nextPlayer(party))
      case 'setDrinking':
        return this.set(setDrinkingOn(party, command.on === true))
      case 'setSitOut':
        return this.set(setSitOut(party, command.player, command.out === true))
      case 'spinWheel':
        return this.set(spinWheel(party, this.random))
      case 'pickBuddy':
        return this.set(pickBuddy(party, command.player))
      case 'abort':
        return this.set(null)
      case 'finish':
        // Free play just ends: its result is kept nowhere.
        if (party.freePlay) return this.set(null)
        if (party.stage !== 'podium') return
        this.store.save(HISTORY, [...this.history, this.result(party)])
        return this.set(null)
    }
  }

  private result(party: Party): PartyResult {
    const points: Record<PlayerId, number> = {}
    for (const row of standings(party)) points[row.player] = row.points
    return {
      finishedAt: this.now().toISOString(),
      players: party.players,
      ranking: finalRanking(party),
      points,
      games: party.games.map((record) => record.gameId),
      ...(party.drinking ? { drinks: drinkTally(party) } : {}),
    }
  }

  private set(next: Party | null): void {
    if (next === this.party) return
    this.party = next
    if (next) this.store.save(PARTY, { format: FORMAT, party: next })
    else this.store.remove(PARTY)
    this.onChange(next)
  }
}
