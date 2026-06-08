import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi } from '../shared/types'

const api: AppApi = {
  login: (username, password, remember) =>
    ipcRenderer.invoke('auth:login', { username, password, remember }),
  autoLogin: () => ipcRenderer.invoke('auth:autoLogin'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  saveCard: (payload) => ipcRenderer.invoke('card:save', payload),
  printCard: (dataUrls) => ipcRenderer.invoke('card:print', { dataUrls }),
  listUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (input) => ipcRenderer.invoke('users:create', input),
  adjustBalance: (input) => ipcRenderer.invoke('users:adjustBalance', input),
  dashboardStats: (userId, role) => ipcRenderer.invoke('dashboard:stats', { userId, role }),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb) => {
    const listener = (_e: unknown, status: Parameters<typeof cb>[0]): void => cb(status)
    ipcRenderer.on('update:status', listener)
    return () => ipcRenderer.removeListener('update:status', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
