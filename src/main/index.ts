import { app, Menu } from 'electron'
import { initState } from './state'
import { initUpdater } from './updater'
import { initWindows } from './windows'

// The show window makes sound without anyone ever touching it.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let focus = (): void => {}
  app.on('second-instance', () => focus())

  void app.whenReady().then(() => {
    if (app.isPackaged) Menu.setApplicationMenu(null)
    initUpdater()
    let relayout = (): void => {}
    const state = initState(() => relayout())
    const windows = initWindows(state)
    relayout = windows.relayout
    focus = windows.focus
  })

  app.on('window-all-closed', () => app.quit())
}
