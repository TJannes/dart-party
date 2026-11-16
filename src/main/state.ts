import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BoardTracker } from '../core/board/tracker'
import { PartyLog } from '../core/log/partyLog'
import { partySummary, type Party } from '../core/party/party'
import { PartySession, type PartyCommand } from '../core/party/session'
import { cleanProfiles } from '../core/players'
import { drinkOrders } from '../core/party/drinking'
import { cleanSettings, enabledDrinkRules, enabledGames, type Settings } from '../core/settings'
import { ipc } from '../shared/api'
import { AutodartsClient } from './autodarts/client'
import { logFiles } from './logFiles'
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
  const log = new PartyLog(logFiles(join(app.getPath('userData'), 'logs')))

  /** Every reset goes through here, so the log says who asked for it. */
  function reset(reason: 'stuck' | 'gameStart' | 'button'): void {
    log.record('reset', { reason })
    void client?.reset()
  }

  function logParty(party: Party | null): void {
    if (party && !log.current) {
      log.begin({ players: party.players.map((p) => p.name), freePlay: party.freePlay === true, appVersion: app.getVersion() })
    }
    if (party) log.party(partySummary(party))
    else log.end()
    logDrinks(party)
  }

  /** The orders of the drinking game, each logged once; a correction logs the list again. */
  let loggedOrders: string[] | null = null
  function logDrinks(party: Party | null): void {
    const orders = party ? drinkOrders(party).map((order) => JSON.stringify(order)) : []
    // A party carried over from before a restart has its orders in the log already.
    loggedOrders ??= orders
    const same = loggedOrders.every((order, n) => orders[n] === order)
    if (!same) log.record('drinksRecounted', { orders: orders.map((order) => JSON.parse(order) as unknown) })
    else for (const order of orders.slice(loggedOrders.length)) log.record('drink', JSON.parse(order))
    loggedOrders = orders
  }

  const session = new PartySession(
    store,
    Math.random,
    (party) => {
      logParty(party)
      broadcast(ipc.party, party)
    },
    () => new Date(),
    () => enabledGames(settings),
    () => {
      // Darts Autodarts noted between games still take up places in its
      // turn of three, so the first player would lose a dart. Only reset
      // when there is something to clear: resetting with a dart still in
      // the board makes it stuck once that dart is pulled.
      if (tracker.snapshot.throws.length > 0) reset('gameStart')
    },
    () => enabledDrinkRules(settings),
  )

  const tracker = new BoardTracker({
    onEvent: (event) => {
      log.record('board', event)
      session.boardEvent(event)
      broadcast(ipc.boardEvent, event)
    },
    onSnapshot: (snapshot) => broadcast(ipc.boardSnapshot, snapshot),
    resetBoard: () => reset('stuck'),
    onRaw: (source, raw) => log.autodarts(source, raw),
  })
  // A party carried over from before a restart keeps writing its own log.
  logParty(session.current)
  log.record('appStarted', { appVersion: app.getVersion() })

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
  ipcMain.on(ipc.resetBoard, () => reset('button'))

  ipcMain.handle(ipc.getParty, () => session.current)
  ipcMain.on(ipc.partyCommand, (_event, command: PartyCommand) => {
    log.record('command', command)
    try {
      session.command(command)
    } catch (error) {
      // A window must never be able to take the main process down.
      console.error('Party command failed', error)
    }
  })

  ipcMain.handle(ipc.flagBug, () => log.flag({ party: session.current, board: tracker.snapshot }))
  ipcMain.on(ipc.noteBug, (_event, logId: unknown, flag: unknown, note: unknown) => {
    if (typeof logId === 'string' && typeof flag === 'number' && typeof note === 'string') log.note(logId, flag, note)
  })
  ipcMain.handle(ipc.listLogs, () => log.list())
  ipcMain.handle(ipc.deleteLog, (_event, logId: unknown) => typeof logId === 'string' && log.delete(logId))
  ipcMain.handle(ipc.saveLog, async (event, logId: unknown) => {
    if (typeof logId !== 'string') return false
    const bundle = log.bundle(logId)
    if (bundle === null) return false
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { defaultPath: `dart-party-log-${logId}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] }
    const choice = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
    if (choice.canceled || !choice.filePath) return false
    writeFileSync(choice.filePath, bundle)
    return true
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
