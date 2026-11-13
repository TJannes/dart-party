import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { ipc, type DartPartyApi, type UpdateStatus } from '../shared/update'

declare const __APP_VERSION__: string

const api: DartPartyApi = {
  appVersion: __APP_VERSION__,
  getUpdateStatus: () => ipcRenderer.invoke(ipc.getUpdateStatus),
  onUpdateStatus: (listener) => {
    const handler = (_event: IpcRendererEvent, status: UpdateStatus): void => listener(status)
    ipcRenderer.on(ipc.updateStatus, handler)
    return () => ipcRenderer.removeListener(ipc.updateStatus, handler)
  },
  updateAction: (action) => ipcRenderer.send(ipc.updateAction, action),
}

contextBridge.exposeInMainWorld('dartParty', api)
