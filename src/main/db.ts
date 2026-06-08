import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null
let dbReady = false

/**
 * Try to connect to the configured remote MySQL. If it isn't configured or is
 * unreachable, the app falls back to a demo mode (see auth.ts) so the UI still
 * runs during development.
 */
export async function initDb(): Promise<boolean> {
  try {
    prisma = new PrismaClient()
    await prisma.$connect()
    dbReady = true
    console.log('[db] connected to MySQL')
  } catch (err) {
    dbReady = false
    console.warn('[db] MySQL unavailable — running in demo mode:', (err as Error).message)
  }
  return dbReady
}

export function getPrisma(): PrismaClient | null {
  return prisma
}

export function isDbReady(): boolean {
  return dbReady
}
