import { strings } from './strings'

/** Where the updater is. The main process owns it; windows only render it. */
export type UpdateStatus =
  /** This copy cannot update itself (development run, or not an AppImage). */
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'upToDate' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export type UpdateAction = 'check' | 'download' | 'install'

export interface UpdateView {
  message: string
  /** The one button to show, if any. Nothing ever happens without a click. */
  button?: { label: string; action: UpdateAction }
}

export function updateView(status: UpdateStatus): UpdateView {
  const s = strings.update
  switch (status.kind) {
    case 'unsupported':
      return { message: s.unsupported }
    case 'idle':
    case 'checking':
      return { message: s.checking }
    case 'upToDate':
      return { message: s.upToDate, button: { label: s.checkAgain, action: 'check' } }
    case 'available':
      return {
        message: s.available(status.version),
        button: { label: s.download, action: 'download' },
      }
    case 'downloading':
      return { message: s.downloading(Math.round(status.percent)) }
    case 'ready':
      return {
        message: s.ready(status.version),
        button: { label: s.install, action: 'install' },
      }
    case 'error':
      return { message: s.error, button: { label: s.retry, action: 'check' } }
  }
}

/** What the preload script exposes to the windows as `window.dartParty`. */
export interface DartPartyApi {
  appVersion: string
  getUpdateStatus(): Promise<UpdateStatus>
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void
  updateAction(action: UpdateAction): void
}

export const ipc = {
  getUpdateStatus: 'update:get-status',
  updateStatus: 'update:status',
  updateAction: 'update:action',
} as const
