import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { ipc, type UpdateAction, type UpdateStatus } from '../shared/update'

// The app looks for a newer release at startup and shows a button. It never
// downloads or installs by itself: an update must not interrupt an evening.

/** Only an installed Windows copy or a Linux AppImage can replace itself. */
function canSelfUpdate(): boolean {
  if (!app.isPackaged) return false
  if (process.platform === 'linux') return Boolean(process.env.APPIMAGE)
  return true
}

let status: UpdateStatus = { kind: 'idle' }

function setStatus(next: UpdateStatus): void {
  status = next
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipc.updateStatus, status)
  }
}

function versionInFlight(): string {
  return 'version' in status ? status.version : ''
}

function check(): void {
  if (status.kind === 'checking' || status.kind === 'downloading' || status.kind === 'ready') return
  autoUpdater.checkForUpdates().catch(() => {
    // Reported through the 'error' event.
  })
}

function download(): void {
  if (status.kind !== 'available') return
  setStatus({ kind: 'downloading', version: status.version, percent: 0 })
  autoUpdater.downloadUpdate().catch(() => {
    // Reported through the 'error' event.
  })
}

function install(): void {
  if (status.kind !== 'ready') return
  // Silent, and start the new version afterwards.
  autoUpdater.quitAndInstall(true, true)
}

export function initUpdater(): void {
  ipcMain.handle(ipc.getUpdateStatus, () => status)

  if (!canSelfUpdate()) {
    status = { kind: 'unsupported' }
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => setStatus({ kind: 'checking' }))
  autoUpdater.on('update-not-available', () => setStatus({ kind: 'upToDate' }))
  autoUpdater.on('update-available', (info) =>
    setStatus({ kind: 'available', version: info.version }),
  )
  autoUpdater.on('download-progress', (progress) =>
    setStatus({ kind: 'downloading', version: versionInFlight(), percent: progress.percent }),
  )
  autoUpdater.on('update-downloaded', (info) => setStatus({ kind: 'ready', version: info.version }))
  autoUpdater.on('error', (error) => setStatus({ kind: 'error', message: error.message }))

  ipcMain.on(ipc.updateAction, (_event, action: UpdateAction) => {
    if (action === 'check') check()
    else if (action === 'download') download()
    else if (action === 'install') install()
  })

  check()
}
