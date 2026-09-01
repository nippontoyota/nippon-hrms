'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('dev_session')
  
  // Redirect to the main HRMS app login page
  const hrmsUrl = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:5173'
  redirect(`${hrmsUrl}/login`)
}
