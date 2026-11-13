import { BrowserWindow, ipcMain } from 'electron'
import { BoardTracker } from '../core/board/tracker'
import { ipc } from '../shared/api'
import { AutodartsClient } from './autodarts/client'

// The main process owns the connection to Autodarts. Windows get snapshots
// and events to render, and can ask for a reset.

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

export function initBoard(): void {
  let client: AutodartsClient | null = null

  const tracker = new BoardTracker({
    onEvent: (event) => broadcast(ipc.boardEvent, event),
    onSnapshot: (snapshot) => broadcast(ipc.boardSnapshot, snapshot),
    resetBoard: () => void client?.reset(),
  })
  client = new AutodartsClient(tracker)

  ipcMain.handle(ipc.getBoardSnapshot, () => tracker.snapshot)
  ipcMain.on(ipc.resetBoard, () => void client.reset())

  client.start()
}
