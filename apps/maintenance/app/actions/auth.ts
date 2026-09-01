'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('dev_session')
  
  // Intelligently route to production Cloudflare app vs local Vite app
  const isProd = process.env.NODE_ENV === 'production'
  const hrmsUrl = isProd ? 'https://nippon-hrms.pages.dev' : 'http://localhost:5173'
  
  redirect(`${hrmsUrl}/login`)
}
