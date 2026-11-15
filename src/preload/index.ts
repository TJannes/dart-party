import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { ipc, type DartPartyApi } from '../shared/api'

declare const __APP_VERSION__: string

/** Subscribes to a channel the main process pushes on. Returns the undo. */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: DartPartyApi = {
  appVersion: __APP_VERSION__,

  getUpdateStatus: () => ipcRenderer.invoke(ipc.getUpdateStatus),
  onUpdateStatus: (listener) => subscribe(ipc.updateStatus, listener),
  updateAction: (action) => ipcRenderer.send(ipc.updateAction, action),

  getBoardSnapshot: () => ipcRenderer.invoke(ipc.getBoardSnapshot),
  onBoardSnapshot: (listener) => subscribe(ipc.boardSnapshot, listener),
  onBoardEvent: (listener) => subscribe(ipc.boardEvent, listener),
  resetBoard: () => ipcRenderer.send(ipc.resetBoard),

  getParty: () => ipcRenderer.invoke(ipc.getParty),
  onParty: (listener) => subscribe(ipc.party, listener),
  partyCommand: (command) => ipcRenderer.send(ipc.partyCommand, command),

  getPlayers: () => ipcRenderer.invoke(ipc.getPlayers),
  savePlayers: (players) => ipcRenderer.invoke(ipc.savePlayers, players),

  getSettings: () => ipcRenderer.invoke(ipc.getSettings),
  onSettings: (listener) => subscribe(ipc.settings, listener),
  updateSettings: (change) => ipcRenderer.send(ipc.updateSettings, change),

  getScreens: () => ipcRenderer.invoke(ipc.getScreens),
  onScreens: (listener) => subscribe(ipc.screens, listener),
  toggleScreens: () => ipcRenderer.send(ipc.toggleScreens),
}

contextBridge.exposeInMainWorld('dartParty', api)
