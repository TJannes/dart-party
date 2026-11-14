import { app, BrowserWindow, ipcMain, screen, shell, type Display } from 'electron'
import { join } from 'node:path'
import type { ScreensState } from '../shared/api'
import { ipc } from '../shared/api'
import { strings } from '../shared/strings'
import { broadcast, type AppState } from './state'

// One window or two. With a second display the show goes there, full screen,
// and the main window stays on the Surface as the control panel. Without one
// the main window is both. One button switches between the two.

let mainWindow: BrowserWindow | null = null
let showWindow: BrowserWindow | null = null

// For trying the show window on a machine with one display.
const forceShow = process.env['DART_PARTY_FORCE_SHOW'] === '1'

function createWindow(role: 'main' | 'show', options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  const window = new BrowserWindow({
    title: strings.appName,
    backgroundColor: '#2b1055',
    show: false,
    ...options,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.once('ready-to-show', () => window.show())

  // The windows only ever show the app itself. Links open in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(`${devServerUrl}?role=${role}`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query: { role } })
  }
  return window
}

/** The display for the show: one that is not the Surface's own screen. */
function showDisplay(): Display | null {
  const all = screen.getAllDisplays()
  if (all.length < 2) return forceShow ? (all[0] ?? null) : null
  const home = all.find((d) => d.internal) ?? screen.getPrimaryDisplay()
  return all.find((d) => d.id !== home.id) ?? null
}

function state(): ScreensState {
  return { displays: screen.getAllDisplays().length, twoWindows: showWindow !== null }
}

/** Opens or closes the show window to match the displays and the setting. */
function layout(app: AppState): void {
  const display = app.settings().screens === 'auto' ? showDisplay() : null

  if (display && !showWindow) {
    showWindow = createWindow('show', forceShow && screen.getAllDisplays().length < 2
      ? { width: 1280, height: 720 }
      : { ...display.bounds, frame: false, fullscreen: true })
    showWindow.on('closed', () => {
      showWindow = null
      broadcast(ipc.screens, state())
    })
  } else if (display && showWindow && !forceShow) {
    showWindow.setBounds(display.bounds)
    showWindow.setFullScreen(true)
  } else if (!display && showWindow) {
    showWindow.destroy()
    showWindow = null
  }
  broadcast(ipc.screens, state())
}

export function initWindows(app: AppState): { relayout: () => void; focus: () => void } {
  mainWindow = createWindow('main', { width: 1280, height: 800, minWidth: 800, minHeight: 560 })
  mainWindow.on('closed', () => {
    mainWindow = null
    showWindow?.destroy()
  })

  ipcMain.handle(ipc.getScreens, state)
  ipcMain.on(ipc.toggleScreens, () => {
    app.updateSettings({ screens: app.settings().screens === 'auto' ? 'single' : 'auto' })
  })

  const relayout = (): void => layout(app)
  screen.on('display-added', relayout)
  screen.on('display-removed', relayout)
  relayout()

  return {
    relayout,
    focus: () => {
      if (!mainWindow) return
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    },
  }
}
