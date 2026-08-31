import { Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server'
    const email = formData.get('email')
    const password = formData.get('password')

    if (email === 'maintenance@nippontoyota.com' && password === 'maintenance123') {
      const cookieStore = await cookies()
      cookieStore.set('dev_session', 'true', { secure: true, path: '/' })
      redirect('/tickets')
    }
    redirect('/login?error=true')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="mb-10 flex flex-col items-center">
        <div className="h-16 w-16 bg-red-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-900/20">
          <Wrench className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Nippon Toyota</h1>
        <p className="text-zinc-400 text-sm mt-1">Facility Management Portal</p>
      </div>

      <div className="w-full max-w-sm">
        <form action={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Email Address</label>
            <Input 
              name="email"
              type="email" 
              defaultValue="maintenance@nippontoyota.com"
              required
              className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <PasswordInput 
              name="password"
              defaultValue="maintenance123"
              required
              className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-md bg-red-600 text-base font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98]"
            >
              Sign In
            </Button>
          </div>
          
          <p className="mt-8 text-center text-xs text-zinc-600">
            For development, use maintenance@nippontoyota.com / maintenance123
          </p>
        </form>
      </div>
    </div>
  )
}
