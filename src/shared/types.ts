// Types shared across the Electron main, preload, and renderer.

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'
export type DbRole = 'ADMIN' | 'OPERATOR'

export interface AuthUser {
  id: number
  username: string
  name: string | null
  role: Role
  balance?: number
  costPerSave?: number
  cardsSaved?: number
  upiId?: string | null
  telegramId?: string | null
}

export interface LoginResult {
  ok: boolean
  token?: string
  user?: AuthUser
  error?: string
}

export interface AppInfo {
  name: string
  version: string
  dbReady: boolean
}

export interface UpdateStatus {
  state: 'available' | 'downloaded'
  version: string
}

export interface UserPublic {
  id: number
  username: string
  name: string | null
  role: DbRole
  balance: number
  costPerSave: number
  cardsSaved: number
  upiId: string | null
  telegramId: string | null
}

export interface CreateUserInput {
  username: string
  password: string
  name?: string
  role: DbRole
  balance: number
  costPerSave: number
  upiId?: string
  telegramId?: string
}

/** Super-admin funds update for a single user. */
export interface AdjustBalanceInput {
  userId: number
  amount: number
  /** 'add' tops up (or deducts, if negative) atomically; 'set' overwrites the balance. */
  mode: 'add' | 'set'
}

export interface DashboardStats {
  role: Role
  balance: number
  costPerSave: number
  cardsSaved: number
  cardsCanSave: number // -1 means unlimited (cost per save is 0)
  totalUsers: number
  totalCards: number
}

export interface SaveCardResult {
  ok: boolean
  dir?: string
  files?: string[]
  balance?: number
  cardsSaved?: number
  error?: string
}

export interface SaveCardPayload {
  userId: number
  role: Role
  regNumber: string
  sides: { front?: string; back?: string }
}

/** The API surface exposed to the renderer via the preload contextBridge. */
export interface AppApi {
  login(username: string, password: string, remember?: boolean): Promise<LoginResult>
  /** Re-login using OS-encrypted saved credentials. `{ ok: false }` if none/invalid. */
  autoLogin(): Promise<LoginResult>
  /** Clear any saved credentials (called on explicit logout). */
  logout(): Promise<void>
  appInfo(): Promise<AppInfo>
  saveCard(payload: SaveCardPayload): Promise<SaveCardResult>
  printCard(dataUrls: string[]): Promise<{ ok: boolean }>
  listUsers(): Promise<UserPublic[]>
  createUser(input: CreateUserInput): Promise<UserPublic>
  adjustBalance(input: AdjustBalanceInput): Promise<UserPublic>
  dashboardStats(userId: number, role: Role): Promise<DashboardStats>
  /** Quit and install a downloaded update. */
  installUpdate(): Promise<void>
  /** Subscribe to auto-update status events. Returns an unsubscribe function. */
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void
}
