import bcrypt from 'bcryptjs'
import { getPrisma, isDbReady } from './db'
import type { AdjustBalanceInput, CreateUserInput, DashboardStats, Role, UserPublic } from '../shared/types'

type DbUser = {
  id: number
  username: string
  name: string | null
  role: 'ADMIN' | 'OPERATOR'
  balance: number
  costPerSave: number
  cardsSaved: number
  upiId: string | null
  telegramId: string | null
}

function toPublic(u: DbUser): UserPublic {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    balance: u.balance,
    costPerSave: u.costPerSave,
    cardsSaved: u.cardsSaved,
    upiId: u.upiId,
    telegramId: u.telegramId
  }
}

export async function listUsers(): Promise<UserPublic[]> {
  const prisma = getPrisma()
  if (!prisma) return []
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
  return users.map(toPublic)
}

export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  const prisma = getPrisma()
  if (!prisma) throw new Error('Database not connected')
  const existing = await prisma.user.findUnique({ where: { username: input.username } })
  if (existing) throw new Error('Username already exists')
  const user = await prisma.user.create({
    data: {
      username: input.username,
      password: await bcrypt.hash(input.password, 10),
      name: input.name ?? null,
      role: input.role,
      balance: input.balance,
      costPerSave: input.costPerSave,
      upiId: input.upiId?.trim() || null,
      telegramId: input.telegramId?.trim() || null
    }
  })
  return toPublic(user)
}

/**
 * Super-admin funds update for a single user. 'add' applies an atomic increment
 * (race-safe against concurrent card saves); 'set' overwrites the balance.
 * Negative resulting balances are rejected. Every change is recorded in AuditLog.
 */
export async function adjustBalance(input: AdjustBalanceInput): Promise<UserPublic> {
  const prisma = getPrisma()
  if (!prisma) throw new Error('Database not connected')

  const { userId, mode } = input
  const amount = Number(input.amount)
  if (!Number.isFinite(amount)) throw new Error('Amount must be a valid number')
  if (mode === 'set' && amount < 0) throw new Error('Balance cannot be negative')

  const before = await prisma.user.findUnique({ where: { id: userId } })
  if (!before) throw new Error('User not found')
  if (mode === 'add' && before.balance + amount < 0) {
    throw new Error('Adjustment would make the balance negative')
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: mode === 'add' ? { balance: { increment: amount } } : { balance: amount }
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'BALANCE_ADJUST',
      meta: { mode, amount, before: before.balance, after: updated.balance }
    }
  })

  return toPublic(updated)
}

/** Checks whether a user can afford one more save. */
export async function canSave(userId: number): Promise<{ ok: boolean; error?: string }> {
  if (!isDbReady()) return { ok: true }
  const prisma = getPrisma()!
  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) return { ok: false, error: 'User not found' }
  if (u.costPerSave > 0 && u.balance < u.costPerSave) {
    return { ok: false, error: 'Insufficient balance for this save.' }
  }
  return { ok: true }
}

/** Deducts cost-per-save, increments the counter, and logs print history. */
export async function recordSave(
  userId: number,
  regNumber: string,
  imagePath: string | null
): Promise<{ balance?: number; cardsSaved?: number }> {
  if (!isDbReady()) return {}
  const prisma = getPrisma()!
  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) return {}
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { balance: { decrement: u.costPerSave }, cardsSaved: { increment: 1 } }
  })
  await prisma.printHistory.create({
    data: {
      userId,
      cardNumber: regNumber || null,
      status: 'COMPLETED',
      imagePath
    }
  })
  return { balance: updated.balance, cardsSaved: updated.cardsSaved }
}

export async function getStats(userId: number, role: Role): Promise<DashboardStats> {
  const empty: DashboardStats = {
    role,
    balance: 0,
    costPerSave: 0,
    cardsSaved: 0,
    cardsCanSave: -1,
    totalUsers: 0,
    totalCards: 0
  }
  if (!isDbReady()) return empty
  const prisma = getPrisma()!

  if (role === 'SUPER_ADMIN') {
    const totalUsers = await prisma.user.count()
    const totalCards = await prisma.printHistory.count()
    const agg = await prisma.user.aggregate({ _sum: { balance: true } })
    return { ...empty, balance: agg._sum.balance ?? 0, cardsSaved: totalCards, totalUsers, totalCards }
  }

  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) return empty
  const cardsCanSave = u.costPerSave > 0 ? Math.floor(u.balance / u.costPerSave) : -1
  return {
    role,
    balance: u.balance,
    costPerSave: u.costPerSave,
    cardsSaved: u.cardsSaved,
    cardsCanSave,
    totalUsers: 0,
    totalCards: 0
  }
}
