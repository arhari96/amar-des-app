import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

const { autoUpdater } = electronUpdater

const SIX_HOURS = 6 * 60 * 60 * 1000

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', status)
  }
}

/**
 * Wires up GitHub-published auto-updates. Updates download in the background and
 * install on quit; the renderer is notified so it can offer an immediate restart.
 * No-op in dev (unpackaged) where there is no published feed.
 */
export function initAutoUpdate(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) =>
    broadcast({ state: 'available', version: info.version })
  )
  autoUpdater.on('update-downloaded', (info) =>
    broadcast({ state: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (err) => console.warn('[updater]', err?.message ?? err))

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((e) => console.warn('[updater] check failed:', e?.message))
  }
  check()
  setInterval(check, SIX_HOURS)
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
