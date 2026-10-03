import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { loginKey, sessionTtlSeconds, verifySecret } from '@/lib/password'
import { branchDefinitionForCode } from '@/lib/maintenance-branches'

export const MAINTENANCE_COOKIE = 'maintenance_session'
export type MaintenanceSession = { accountId: string; role: 'ADMIN' | 'BRANCH'; branchId: string | null; branchName?: string | null; expiresAt: number }

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

export const getMaintenanceSession = cache(async (): Promise<MaintenanceSession | null> => {
  const value = (await cookies()).get(MAINTENANCE_COOKIE)?.value
  if (!value) return null
  const session = decodeSession(value)
  if (!session) return null
  const account = await prisma.maintenanceAccount.findFirst({ where: { id: session.accountId, is_active: true }, select: { id: true, role: true, branch_id: true, branch: { select: { name: true } } } })
  if (!account || account.role !== session.role || account.branch_id !== session.branchId) return null
  return { ...session, branchName: account.branch?.name ?? null }
})

export async function requireMaintenanceSession() {
  const session = await getMaintenanceSession()
  if (!session) redirect('/login')
  return session
}
export async function requireMaintenanceAdmin() { const session = await requireMaintenanceSession(); if (session.role !== 'ADMIN') redirect('/tickets'); return session }
export async function requireMaintenanceBranch() { const session = await requireMaintenanceSession(); if (session.role !== 'BRANCH' || !session.branchId) redirect('/tickets'); return session }
export async function requireMaintenanceActor() { return (await requireMaintenanceSession()).accountId }

export async function authenticateMaintenance(identifier: string, secret: string) {
  const normalized = identifier.trim()
  const isAdminLogin = normalized.includes('@')
  const branchCode = normalized.toUpperCase()
  let account: { id: string, role: 'ADMIN' | 'BRANCH', branch_id: string | null, secret_hash: string } | null = null

  if (isAdminLogin) {
    account = await prisma.maintenanceAccount.findFirst({ where: { email: normalized.toLowerCase(), is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
  } else {
    const def = branchDefinitionForCode(branchCode)
    if (def) {
      const branch = await prisma.maintenanceBranch.findFirst({ where: { name: def.name } })
      if (branch) {
        account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: branch.id, role: 'BRANCH', is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
      }
    }
  }

  if (!account || !(await verifySecret(isAdminLogin ? secret : branchCode, account.secret_hash))) return null
  await createMaintenanceSession(account)
  return { role: account.role, branchId: account.branch_id }
}
