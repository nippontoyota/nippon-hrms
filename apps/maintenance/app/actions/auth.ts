'use server'

import { redirect } from 'next/navigation'
import { authenticateMaintenance, clearMaintenanceSession } from '@/lib/maintenance-auth'

export async function login(formData: FormData) {
  const identifier = String(formData.get('identifier') ?? '')
  const secret = String(formData.get('secret') ?? '')
  if (!identifier || (identifier.includes('@') && !secret)) redirect('/login?error=missing')
  try {
    const account = await authenticateMaintenance(identifier, secret)
    if (!account) redirect('/login?error=invalid')
    redirect('/tickets')
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error
    console.error('Maintenance login failed', error)
    redirect('/login?error=unavailable')
  }
}

export async function logout() {
  await clearMaintenanceSession()
  redirect('/login')
}
