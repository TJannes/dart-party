import type { BoardEvent } from '../core/board/events'
import type { BoardSnapshot } from '../core/board/tracker'
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
}

export const ipc = {
  getUpdateStatus: 'update:get-status',
  updateStatus: 'update:status',
  updateAction: 'update:action',
  getBoardSnapshot: 'board:get-snapshot',
  boardSnapshot: 'board:snapshot',
  boardEvent: 'board:event',
  resetBoard: 'board:reset',
} as const
