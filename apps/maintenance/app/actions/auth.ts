'use server'

import { redirect } from 'next/navigation'
import { authenticateMaintenance, clearMaintenanceSession } from '@/lib/maintenance-auth'

export async function login(formData: FormData) {
  const identifier = String(formData.get('identifier') ?? '')
  const secret = String(formData.get('secret') ?? '')
  const loginType = String(formData.get('loginType') ?? 'admin') === 'branch' ? 'branch' : 'admin'
  const path = loginType === 'branch' ? '/branch/login' : '/admin/login'
  if (!identifier || (loginType === 'admin' && (!identifier.includes('@') || !secret)) || (loginType === 'branch' && identifier.includes('@'))) redirect(`${path}?error=missing`)
  try {
    const account = await authenticateMaintenance(identifier, secret)
    if (!account || (loginType === 'admin' && account.role !== 'ADMIN') || (loginType === 'branch' && account.role !== 'BRANCH')) redirect(`${path}?error=invalid`)
    redirect('/tickets')
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error
    console.error('Maintenance login failed', error)
    redirect(`${path}?error=unavailable`)
  }
}

export async function logout() {
  await clearMaintenanceSession()
  redirect('/login')
}
