import type { BoardEvent } from '../core/board/events'
import type { BoardSnapshot } from '../core/board/tracker'
import type { Party, Player } from '../core/party/party'
import type { PartyCommand } from '../core/party/session'
import type { Settings } from '../core/settings'
import type { UpdateAction, UpdateStatus } from './update'

/** How the app is spread over the displays right now. */
export interface ScreensState {
  displays: number
  /** True when the show has its own window on a second display. */
  twoWindows: boolean
}

/** What the preload script exposes to the windows as `window.dartParty`. */
export interface DartPartyApi {
  appVersion: string

  getUpdateStatus(): Promise<UpdateStatus>
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void
  updateAction(action: UpdateAction): void

  getBoardSnapshot(): Promise<BoardSnapshot>
  onBoardSnapshot(listener: (snapshot: BoardSnapshot) => void): () => void
  onBoardEvent(listener: (event: BoardEvent) => void): () => void
  resetBoard(): void

  /** The party being played, or null. */
  getParty(): Promise<Party | null>
  onParty(listener: (party: Party | null) => void): () => void
  partyCommand(command: PartyCommand): void

  /** The saved player profiles. Saving answers the list as it was kept. */
  getPlayers(): Promise<Player[]>
  savePlayers(players: Player[]): Promise<Player[]>

  getSettings(): Promise<Settings>
  onSettings(listener: (settings: Settings) => void): () => void
  updateSettings(change: Partial<Settings>): void

  getScreens(): Promise<ScreensState>
  onScreens(listener: (screens: ScreensState) => void): () => void
  /** Switches between one window and a separate show window. */
  toggleScreens(): void
}

export const ipc = {
  getUpdateStatus: 'update:get-status',
  updateStatus: 'update:status',
  updateAction: 'update:action',
  getBoardSnapshot: 'board:get-snapshot',
  boardSnapshot: 'board:snapshot',
  boardEvent: 'board:event',
  resetBoard: 'board:reset',
  getParty: 'party:get',
  party: 'party:changed',
  partyCommand: 'party:command',
  getPlayers: 'players:get',
  savePlayers: 'players:save',
  getSettings: 'settings:get',
  settings: 'settings:changed',
  updateSettings: 'settings:update',
  getScreens: 'screens:get',
  screens: 'screens:changed',
  toggleScreens: 'screens:toggle',
} as const
