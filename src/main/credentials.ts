import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

// Credentials are encrypted with the OS keychain (macOS Keychain / Windows DPAPI)
// via Electron safeStorage and written to the app's userData dir — never plaintext.
const file = (): string => join(app.getPath('userData'), 'session.bin')

interface SavedCredentials {
  username: string
  password: string
}

export function saveCredentials(username: string, password: string): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[credentials] OS encryption unavailable — not saving session')
      return
    }
    const blob = safeStorage.encryptString(JSON.stringify({ username, password }))
    writeFileSync(file(), blob)
  } catch (err) {
    console.warn('[credentials] save failed:', (err as Error).message)
  }
}

export function loadCredentials(): SavedCredentials | null {
  try {
    const f = file()
    if (!existsSync(f) || !safeStorage.isEncryptionAvailable()) return null
    const json = safeStorage.decryptString(readFileSync(f))
    const parsed = JSON.parse(json) as SavedCredentials
    if (!parsed?.username || !parsed?.password) return null
    return parsed
  } catch (err) {
    console.warn('[credentials] load failed:', (err as Error).message)
    return null
  }
}

export function clearCredentials(): void {
  try {
    const f = file()
    if (existsSync(f)) unlinkSync(f)
  } catch (err) {
    console.warn('[credentials] clear failed:', (err as Error).message)
  }
}
