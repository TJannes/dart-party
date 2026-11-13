import type { BoardEvent } from '../core/board/events'
import type { BoardSnapshot } from '../core/board/tracker'
import type { Evening } from '../core/evening/evening'
import type { EveningCommand } from '../core/evening/session'
import type { UpdateAction, UpdateStatus } from './update'

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

  /** The evening being played, or null. */
  getEvening(): Promise<Evening | null>
  onEvening(listener: (evening: Evening | null) => void): () => void
  eveningCommand(command: EveningCommand): void
}

export const ipc = {
  getUpdateStatus: 'update:get-status',
  updateStatus: 'update:status',
  updateAction: 'update:action',
  getBoardSnapshot: 'board:get-snapshot',
  boardSnapshot: 'board:snapshot',
  boardEvent: 'board:event',
  resetBoard: 'board:reset',
  getEvening: 'evening:get',
  evening: 'evening:changed',
  eveningCommand: 'evening:command',
} as const
