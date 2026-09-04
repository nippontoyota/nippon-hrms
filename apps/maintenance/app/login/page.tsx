import { login } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const message = error === 'invalid' ? 'The email, password, or branch code was not accepted.' : error === 'unavailable' ? 'Login is temporarily unavailable.' : error === 'missing' ? 'Enter your login and password or branch code.' : ''
  return <main className="flex min-h-screen items-center justify-center bg-background p-4">
    <div className="w-full max-w-sm">
      <div className="mb-10 flex flex-col items-center"><img src="/nippon-logo.png" alt="Nippon Toyota" className="mb-4 h-20 object-contain" /><h1 className="text-2xl font-bold tracking-tight text-foreground">Maintenance Portal</h1><p className="mt-2 text-center text-sm text-muted-foreground">Use the admin account or your branch code.</p></div>
      <form action={login} className="space-y-4">
        <div className="space-y-1.5"><label className="text-sm font-medium text-foreground" htmlFor="identifier">Admin email or branch code</label><Input id="identifier" name="identifier" autoCapitalize="characters" autoComplete="username" required placeholder="admin@nippontoyota.com or TKM2841" className="h-12" /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium text-foreground" htmlFor="secret">Admin password <span className="font-normal text-muted-foreground">(leave blank for branch login)</span></label><PasswordInput id="secret" name="secret" autoComplete="current-password" className="h-12" /></div>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <Button type="submit" className="h-12 w-full rounded-md border border-red-700 text-base font-semibold" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>Sign in</Button>
      </form>
    </div>
  </main>
}
