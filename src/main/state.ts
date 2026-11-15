import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { BoardTracker } from '../core/board/tracker'
import { PartySession, type PartyCommand } from '../core/party/session'
import { cleanProfiles } from '../core/players'
import { cleanSettings, enabledGames, type Settings } from '../core/settings'
import { ipc } from '../shared/api'
import { AutodartsClient } from './autodarts/client'
import { fileStore } from './store'

// The main process owns everything that must survive a window: the
// connection to Autodarts, the party being played, the player profiles and
// the settings. Windows get these to render and send commands back.

export function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

export interface AppState {
  settings(): Settings
  /** Saves the settings, applies them and tells the windows. */
  updateSettings(change: Partial<Settings>): void
}

export function initState(onSettingsChanged: (settings: Settings) => void): AppState {
  const store = fileStore(join(app.getPath('userData'), 'data'))
  let settings = cleanSettings(store.load('settings'))
  let client: AutodartsClient | null = null

  const session = new PartySession(
    store,
    Math.random,
    (party) => broadcast(ipc.party, party),
    () => new Date(),
    () => enabledGames(settings),
    () => {
      // Darts Autodarts noted between games still take up places in its
      // turn of three, so the first player would lose a dart. Only reset
      // when there is something to clear: resetting with a dart still in
      // the board makes it stuck once that dart is pulled.
      if (tracker.snapshot.throws.length > 0) client?.reset()
    },
  )

  const tracker = new BoardTracker({
    onEvent: (event) => {
      session.boardEvent(event)
      broadcast(ipc.boardEvent, event)
    },
    onSnapshot: (snapshot) => broadcast(ipc.boardSnapshot, snapshot),
    resetBoard: () => void client?.reset(),
  })

  function connect(): void {
    client?.stop()
    client = new AutodartsClient(tracker, settings.autodartsAddress)
    client.start()
  }

  function updateSettings(change: Partial<Settings>): void {
    const next = cleanSettings({ ...settings, ...change })
    const moved = next.autodartsAddress !== settings.autodartsAddress
    settings = next
    store.save('settings', settings)
    if (moved) {
      tracker.linkDown()
      connect()
    }
    broadcast(ipc.settings, settings)
    onSettingsChanged(settings)
  }

  ipcMain.handle(ipc.getBoardSnapshot, () => tracker.snapshot)
  ipcMain.on(ipc.resetBoard, () => void client?.reset())

  ipcMain.handle(ipc.getParty, () => session.current)
  ipcMain.on(ipc.partyCommand, (_event, command: PartyCommand) => {
    try {
      session.command(command)
    } catch (error) {
      // A window must never be able to take the main process down.
      console.error('Party command failed', error)
    }
  })

  ipcMain.handle(ipc.getPlayers, () => cleanProfiles(store.load('players')))
  ipcMain.handle(ipc.savePlayers, (_event, players: unknown) => {
    const cleaned = cleanProfiles(players)
    store.save('players', cleaned)
    return cleaned
  })

  ipcMain.handle(ipc.getSettings, () => settings)
  ipcMain.on(ipc.updateSettings, (_event, change: unknown) => {
    if (typeof change === 'object' && change !== null) updateSettings(change as Partial<Settings>)
  })

  connect()
  return { settings: () => settings, updateSettings }
}
