import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Building2, ShieldCheck, TriangleAlert } from 'lucide-react'
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
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f5] p-4 text-[#111214] sm:p-6">
      <section className="w-full max-w-md rounded-3xl border-2 border-[#111214] bg-white p-6 shadow-[6px_6px_0_#111214] sm:p-9">
        <header className="mb-9 text-center">
          <Image src="/nippon-logo.png" alt="Nippon Toyota" width={94} height={62} priority className="mx-auto h-16 w-auto object-contain" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">Maintenance portal</p>
        </header>

        <div className="mb-7 rounded-2xl border-2 border-[#f5c4c8] bg-[#fff3f4] p-4">
          <div className="flex items-center gap-3 text-[#b60718]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              {admin ? <ShieldCheck className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> : <Building2 className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />}
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]">{admin ? 'Admin account' : 'Branch account'}</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-[#111214]">{admin ? 'Administrator sign in' : 'Branch sign in'}</h1>
            </div>
          </div>
          <p className="mt-3 pl-[52px] text-sm leading-5 text-[#69707c]">
            {admin ? 'See and manage tickets across every branch.' : 'Use your unique branch code to see your tickets.'}
          </p>
        </div>

        <form action={login} className="space-y-5">
          <input type="hidden" name="loginType" value={kind} />

          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="identifier">{admin ? 'Admin email' : 'Branch code'}</label>
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
              className="h-14 rounded-xl border-2 border-[#cbd0d8] bg-[#f8f9fb] px-4 text-base font-semibold shadow-none placeholder:font-normal placeholder:text-[#9aa1ad] focus-visible:border-[#eb0a1e] focus-visible:ring-4 focus-visible:ring-[#eb0a1e]/15"
            />
          </div>

          {admin && (
            <div className="space-y-2">
              <label className="text-sm font-bold" htmlFor="secret">Admin password</label>
              <PasswordInput
                id="secret"
                name="secret"
                autoComplete="current-password"
                required
                className="h-14 rounded-xl border-2 border-[#cbd0d8] bg-[#f8f9fb] px-4 text-base font-semibold shadow-none focus-visible:border-[#eb0a1e] focus-visible:ring-4 focus-visible:ring-[#eb0a1e]/15"
              />
            </div>
          )}

          {message && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border-2 border-[#f2b8bd] bg-[#fff1f2] p-3.5 text-sm font-semibold leading-5 text-[#b4232c]">
              <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          <Button type="submit" className="h-14 w-full rounded-xl border-2 border-[#b60718] bg-[#eb0a1e] text-base font-bold text-white shadow-[0_3px_0_#b60718] hover:bg-[#d9091b] active:translate-y-px active:shadow-none">
            Sign in to {admin ? 'admin' : 'branch'} account
          </Button>
        </form>

        <div className="mt-7 border-t-2 border-[#eef0f3] pt-5 text-center text-sm text-[#69707c]">
          {admin ? (
            <p>Need branch access? <Link className="font-bold text-[#eb0a1e] underline-offset-4 hover:underline" href="/login">Use branch login</Link></p>
          ) : (
            <p>Managing the network? <Link className="font-bold text-[#eb0a1e] underline-offset-4 hover:underline" href="/admin/login">Use admin login</Link></p>
          )}
        </div>
      </section>
    </main>
  )
}
