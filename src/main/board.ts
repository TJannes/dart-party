import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { BoardTracker } from '../core/board/tracker'
import { EveningSession, type EveningCommand } from '../core/evening/session'
import { ipc } from '../shared/api'
import { AutodartsClient } from './autodarts/client'
import { fileStore } from './store'

// The main process owns the connection to Autodarts and the evening being
// played. Windows get the board snapshot, board events and the evening to
// render, and send commands back.

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

export function initBoard(): void {
  let client: AutodartsClient | null = null

  const session = new EveningSession(
    fileStore(join(app.getPath('userData'), 'data')),
    Math.random,
    (evening) => broadcast(ipc.evening, evening),
  )

  const tracker = new BoardTracker({
    onEvent: (event) => {
      session.boardEvent(event)
      broadcast(ipc.boardEvent, event)
    },
    onSnapshot: (snapshot) => broadcast(ipc.boardSnapshot, snapshot),
    resetBoard: () => void client?.reset(),
  })
  client = new AutodartsClient(tracker)

  ipcMain.handle(ipc.getBoardSnapshot, () => tracker.snapshot)
  ipcMain.on(ipc.resetBoard, () => void client.reset())
  ipcMain.handle(ipc.getEvening, () => session.current)
  ipcMain.on(ipc.eveningCommand, (_event, command: EveningCommand) => {
    try {
      session.command(command)
    } catch (error) {
      // A window must never be able to take the main process down.
      console.error('Evening command failed', error)
    }
  })

  client.start()
}
