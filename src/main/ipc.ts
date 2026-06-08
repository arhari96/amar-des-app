import { app, ipcMain } from 'electron'
import { login } from './auth'
import { clearCredentials, loadCredentials, saveCredentials } from './credentials'
import { isDbReady } from './db'
import { quitAndInstall } from './updater'
import { saveCard, printCard } from './cardService'
import { adjustBalance, canSave, createUser, getStats, listUsers, recordSave } from './userService'
import type {
  AdjustBalanceInput,
  AppInfo,
  CreateUserInput,
  Role,
  SaveCardPayload,
  SaveCardResult
} from '../shared/types'

/** Registers all IPC handlers the renderer can invoke. */
export function registerIpc(): void {
  ipcMain.handle(
    'auth:login',
    async (_e, args: { username: string; password: string; remember?: boolean }) => {
      const res = await login(args.username, args.password)
      if (res.ok && args.remember) saveCredentials(args.username, args.password)
      else if (!args.remember) clearCredentials()
      return res
    }
  )

  ipcMain.handle('auth:autoLogin', async () => {
    const creds = loadCredentials()
    if (!creds) return { ok: false }
    const res = await login(creds.username, creds.password)
    // Credentials changed (e.g. password reset) → drop the stale saved session.
    if (!res.ok) clearCredentials()
    return res
  })

  ipcMain.handle('auth:logout', async () => {
    clearCredentials()
  })

  ipcMain.handle('app:info', async (): Promise<AppInfo> => {
    return { name: 'Smart RC', version: app.getVersion(), dbReady: isDbReady() }
  })

  ipcMain.handle('card:save', async (_e, payload: SaveCardPayload): Promise<SaveCardResult> => {
    const { userId, role, regNumber, sides } = payload
    const billed = role !== 'SUPER_ADMIN' && isDbReady()

    if (billed) {
      const check = await canSave(userId)
      if (!check.ok) return { ok: false, error: check.error }
    }

    const saved = await saveCard(regNumber, sides)

    let balance: number | undefined
    let cardsSaved: number | undefined
    if (billed) {
      const r = await recordSave(userId, regNumber, saved.files[0] ?? null)
      balance = r.balance
      cardsSaved = r.cardsSaved
    }
    return { ok: true, dir: saved.dir, files: saved.files, balance, cardsSaved }
  })

  ipcMain.handle('card:print', async (_e, args: { dataUrls: string[] }) => {
    return printCard(args.dataUrls)
  })

  ipcMain.handle('users:list', async () => listUsers())

  ipcMain.handle('users:create', async (_e, input: CreateUserInput) => createUser(input))

  ipcMain.handle('users:adjustBalance', async (_e, input: AdjustBalanceInput) => adjustBalance(input))

  ipcMain.handle('dashboard:stats', async (_e, args: { userId: number; role: Role }) =>
    getStats(args.userId, args.role)
  )

  ipcMain.handle('update:install', async () => quitAndInstall())
}
