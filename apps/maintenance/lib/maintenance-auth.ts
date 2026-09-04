import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { sessionTtlSeconds, verifySecret } from '@/lib/password'

export const MAINTENANCE_COOKIE = 'maintenance_session'
export type MaintenanceSession = { accountId: string; role: 'ADMIN' | 'BRANCH'; branchId: string | null; expiresAt: number }

const branchNamesByCode: Record<string, string> = {
  IR01A: 'Irinjalakuda',
  CO01B: 'Kalamaserry',
  KY01A: 'Kayamkulam',
  TR01A: 'Kazhakoottam',
  KL01A: 'Kollam',
  KT01A: 'Kottayam',
  MV01A: 'Muvattupuzha',
  CO01A: 'Nettor',
  PH01A: 'Pathanamthitta',
  TL01A: 'Thiruvalla',
  TI01A: 'Trichur',
}

function sessionSecret() {
  const secret = process.env.MAINTENANCE_SESSION_SECRET
  if (!secret) throw new Error('MAINTENANCE_SESSION_SECRET is not configured')
  return secret
}
function sign(value: string) { return createHmac('sha256', sessionSecret()).update(value).digest('base64url') }
function encodeSession(session: MaintenanceSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}
function decodeSession(value: string): MaintenanceSession | null {
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as MaintenanceSession
    if (!parsed.accountId || !['ADMIN', 'BRANCH'].includes(parsed.role) || parsed.expiresAt <= Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch { return null }
}

export async function createMaintenanceSession(account: { id: string; role: 'ADMIN' | 'BRANCH'; branch_id: string | null }) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds()
  const cookieStore = await cookies()
  cookieStore.set(MAINTENANCE_COOKIE, encodeSession({ accountId: account.id, role: account.role, branchId: account.branch_id, expiresAt }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionTtlSeconds(),
  })
}

export async function clearMaintenanceSession() { (await cookies()).delete(MAINTENANCE_COOKIE) }

export async function getMaintenanceSession(): Promise<MaintenanceSession | null> {
  const value = (await cookies()).get(MAINTENANCE_COOKIE)?.value
  if (!value) return null
  const session = decodeSession(value)
  if (!session) return null
  const account = await prisma.maintenanceAccount.findFirst({ where: { id: session.accountId, is_active: true }, select: { id: true, role: true, branch_id: true } })
  if (!account || account.role !== session.role || account.branch_id !== session.branchId) return null
  return session
}

export async function requireMaintenanceSession() {
  const session = await getMaintenanceSession()
  if (!session) redirect('/login')
  return session
}
export async function requireMaintenanceAdmin() { const session = await requireMaintenanceSession(); if (session.role !== 'ADMIN') throw new Error('Admin access required'); return session }
export async function requireMaintenanceBranch() { const session = await requireMaintenanceSession(); if (session.role !== 'BRANCH' || !session.branchId) throw new Error('Branch access required'); return session }
export async function requireMaintenanceActor() { return (await requireMaintenanceSession()).accountId }

export async function authenticateMaintenance(identifier: string, secret: string) {
  const normalized = identifier.trim()
  const isAdminLogin = normalized.includes('@')
  const branchCode = normalized.toUpperCase()
  const account = isAdminLogin
    ? await prisma.maintenanceAccount.findFirst({ where: { email: normalized.toLowerCase(), is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
    : await prisma.maintenanceAccount.findFirst({ where: { branch: { name: branchNamesByCode[branchCode] }, is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
  if (!account || (!isAdminLogin && !branchNamesByCode[branchCode]) || (isAdminLogin && !(await verifySecret(secret, account.secret_hash)))) return null
  await createMaintenanceSession(account)
  return { role: account.role, branchId: account.branch_id }
}
