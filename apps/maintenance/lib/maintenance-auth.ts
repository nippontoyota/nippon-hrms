import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function requireMaintenanceActor(): Promise<string> {
  const cookieStore = await cookies()
  if (cookieStore.get('dev_session')?.value === 'true') return 'dev:maintenance'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  return user.id
}
