import { login } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type LoginKind = 'admin' | 'branch'

export function AuthLoginPage({ kind, error }: { kind: LoginKind; error?: string }) {
  const admin = kind === 'admin'
  const message = error === 'invalid' ? (admin ? 'The admin email or password was not accepted.' : 'The branch code was not accepted.') : error === 'unavailable' ? 'Login is temporarily unavailable.' : error === 'missing' ? (admin ? 'Enter the admin email and password.' : 'Enter your branch code.') : ''
  return <main className="flex min-h-screen items-center justify-center bg-background p-4">
    <div className="w-full max-w-sm">
      <div className="mb-10 flex flex-col items-center"><img src="/nippon-logo.png" alt="Nippon Toyota" className="mb-4 h-20 object-contain" /><h1 className="text-2xl font-bold tracking-tight text-foreground">Maintenance Portal</h1><p className="mt-2 text-center text-sm text-muted-foreground">{admin ? 'Administrator access' : 'Branch maintenance access'}</p></div>
      <form action={login} className="space-y-4">
        <input type="hidden" name="loginType" value={kind} />
        <div className="space-y-1.5"><label className="text-sm font-medium text-foreground" htmlFor="identifier">{admin ? 'Admin email' : 'Branch code'}</label><Input id="identifier" name="identifier" autoCapitalize={admin ? 'none' : 'characters'} autoComplete="username" required placeholder={admin ? 'admin@nippontoyota.com' : 'TL01A'} className="h-12" /></div>
        {admin && <div className="space-y-1.5"><label className="text-sm font-medium text-foreground" htmlFor="secret">Admin password</label><PasswordInput id="secret" name="secret" autoComplete="current-password" required className="h-12" /></div>}
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <Button type="submit" className="h-12 w-full rounded-md border border-red-700 text-base font-semibold" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{admin ? <>Branch account? <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/branch/login">Sign in here</Link></> : <>Administrator? <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/admin/login">Sign in here</Link></>}</p>
    </div>
  </main>
}
