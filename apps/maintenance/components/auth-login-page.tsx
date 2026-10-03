import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { TriangleAlert } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

type LoginKind = 'admin' | 'branch'

export function AuthLoginPage({ kind, error }: { kind: LoginKind; error?: string }) {
  const admin = kind === 'admin'
  const message =
    error === 'invalid'
      ? admin ? 'The admin email or password was not accepted.' : 'That branch code was not accepted.'
      : error === 'unavailable'
        ? 'Login is temporarily unavailable. Try again in a moment.'
        : error === 'missing'
          ? admin ? 'Enter the admin email and password.' : 'Enter your branch code to continue.'
          : ''

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 text-slate-900 sm:p-6">
      <section className="w-full max-w-[420px] p-6 sm:p-10">
        <header className="mb-8 text-center">
          <Image src="/maintenance-logo.png" alt="Nippon Toyota" width={120} height={40} priority className="mx-auto h-12 w-auto object-contain" />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Maintenance portal</p>
        </header>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{admin ? 'Administrator sign in' : 'Branch sign in'}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {admin ? 'See and manage tickets across every branch.' : 'Use your unique branch code to see your tickets.'}
          </p>
        </div>

        <form action={login} className="space-y-5">
          <input type="hidden" name="loginType" value={kind} />

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="identifier">{admin ? 'Admin email' : 'Branch code'}</label>
            <Input
              id="identifier"
              name="identifier"
              type={admin ? 'email' : 'text'}
              autoCapitalize={admin ? 'none' : 'characters'}
              autoComplete="username"
              autoFocus
              inputMode={admin ? 'email' : 'text'}
              maxLength={admin ? 120 : 32}
              spellCheck={false}
              required
              placeholder={admin ? 'admin@nippontoyota.com' : 'Enter branch code'}
              className="h-11 rounded-lg border-slate-300 bg-white px-3 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500"
            />
          </div>

          {admin && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900" htmlFor="secret">Admin password</label>
              <PasswordInput
                id="secret"
                name="secret"
                autoComplete="current-password"
                required
                className="h-11 rounded-lg border-slate-300 bg-white px-3 text-sm shadow-sm transition-colors focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500"
              />
            </div>
          )}

          {message && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          <Button type="submit" className="h-11 w-full rounded-lg bg-red-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
            Sign in
          </Button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
          {admin ? (
            <p>Need branch access? <Link className="font-semibold text-red-600 hover:text-red-700 hover:underline" href="/login">Use branch login</Link></p>
          ) : (
            <p>Managing the network? <Link className="font-semibold text-red-600 hover:text-red-700 hover:underline" href="/admin/login">Use admin login</Link></p>
          )}
        </div>
      </section>
    </main>
  )
}
