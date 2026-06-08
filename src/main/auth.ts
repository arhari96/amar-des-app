import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPrisma, isDbReady } from './db'
import type { AuthUser, LoginResult } from '../shared/types'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'

const SA_USER = process.env.SUPER_ADMIN_USERNAME || ''
const SA_PASS = process.env.SUPER_ADMIN_PASSWORD || ''
const SA_NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin'

// Used only when MySQL isn't configured yet, so the UI is testable.
const DEMO = { id: 1, username: 'admin', password: 'admin123', name: 'Administrator', role: 'ADMIN' as const }

function sign(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN } as jwt.SignOptions
  )
}

export async function login(username: string, password: string): Promise<LoginResult> {
  // Super admin lives in .env (never in the DB).
  if (SA_USER && username === SA_USER && password === SA_PASS) {
    const user: AuthUser = { id: 0, username: SA_USER, name: SA_NAME, role: 'SUPER_ADMIN' }
    return { ok: true, token: sign(user), user }
  }

  if (!isDbReady()) {
    if (username === DEMO.username && password === DEMO.password) {
      const user: AuthUser = { id: DEMO.id, username: DEMO.username, name: DEMO.name, role: DEMO.role }
      return { ok: true, token: sign(user), user }
    }
    return { ok: false, error: 'Database not configured. Demo login: admin / admin123' }
  }

  const prisma = getPrisma()!
  const found = await prisma.user.findUnique({ where: { username } })
  if (!found) return { ok: false, error: 'Invalid username or password' }

  const valid = await bcrypt.compare(password, found.password)
  if (!valid) return { ok: false, error: 'Invalid username or password' }

  const user: AuthUser = {
    id: found.id,
    username: found.username,
    name: found.name,
    role: found.role,
    balance: found.balance,
    costPerSave: found.costPerSave,
    cardsSaved: found.cardsSaved,
    upiId: found.upiId,
    telegramId: found.telegramId
  }
  return { ok: true, token: sign(user), user }
}

/** Create a default admin on first run (only when a real DB is connected). */
export async function seedAdmin(): Promise<void> {
  if (!isDbReady()) return
  const prisma = getPrisma()!
  const count = await prisma.user.count()
  if (count === 0) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        name: 'Administrator',
        role: 'ADMIN'
      }
    })
    console.log('[auth] seeded default admin (admin / admin123)')
  }
}
