import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { ArrowRight, Building2, Check, ShieldCheck, TriangleAlert } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

type LoginKind = 'admin' | 'branch'

const benefits = [
  'See your branch tickets at a glance',
  'Take action or hand work to another branch',
  'Keep every maintenance update in one place',
]

export function AuthLoginPage({ kind, error }: { kind: LoginKind; error?: string }) {
  const admin = kind === 'admin'
  const message =
    error === 'invalid'
      ? admin
        ? 'The admin email or password was not accepted.'
        : 'That branch code was not accepted.'
      : error === 'unavailable'
        ? 'Login is temporarily unavailable. Try again in a moment.'
        : error === 'missing'
          ? admin
            ? 'Enter the admin email and password.'
            : 'Enter your branch code to continue.'
          : ''

  return (
    <main className="min-h-screen bg-[#eef1f5] p-3 text-[#101114] sm:p-6 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[2rem] border-2 border-[#101114] bg-white shadow-[8px_8px_0_#101114] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr] lg:rounded-[2.5rem] lg:shadow-[14px_14px_0_#101114]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#111214] p-7 text-white sm:p-10 lg:p-14">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2">
              <Image src="/nippon-logo.png" alt="" width={36} height={36} priority className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">Nippon Toyota</p>
              <p className="mt-0.5 text-sm font-semibold">Maintenance operations</p>
            </div>
          </div>

          <div className="relative z-10 mt-16 max-w-md lg:mt-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75">
              <span className="h-2 w-2 rounded-full bg-[#eb0a1e]" aria-hidden="true" />
              11 branches · one live queue
            </p>
            <h1 className="max-w-[10ch] text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Keep the work moving.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/65 sm:text-lg">
              A focused workspace for raising, assigning, and closing maintenance tickets across the network.
            </p>
          </div>

          <div className="relative z-10 mt-14 space-y-3 lg:mt-0">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-sm font-medium text-white/75">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eb0a1e] text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {benefit}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute -bottom-20 -right-24 h-64 w-64 rounded-full border-[28px] border-[#eb0a1e]/20" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-14 top-1/3 h-44 w-44 rounded-full border-[18px] border-white/5" aria-hidden="true" />
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-10 flex items-start justify-between gap-6">
              <div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f1] text-[#eb0a1e]">
                  {admin ? <ShieldCheck className="h-7 w-7" strokeWidth={2.5} /> : <Building2 className="h-7 w-7" strokeWidth={2.5} />}
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#eb0a1e]">{admin ? 'Admin access' : 'Branch access'}</p>
                <h2 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">{admin ? 'Welcome back.' : 'Your branch desk.'}</h2>
                <p className="mt-3 max-w-md text-base leading-6 text-[#5e6470]">
                  {admin ? 'Review tickets and transfers across the complete network.' : 'Enter your unique branch code to open your ticket queue.'}
                </p>
              </div>
              <span className="hidden rounded-full bg-[#f3f4f6] px-3 py-1.5 text-xs font-semibold text-[#69707c] sm:inline-flex">Secure sign in</span>
            </div>

            <form action={login} className="space-y-6">
              <input type="hidden" name="loginType" value={kind} />

              <div className="space-y-2.5">
                <label className="text-sm font-bold" htmlFor="identifier">{admin ? 'Admin email' : 'Unique branch code'}</label>
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
                  placeholder={admin ? 'admin@nippontoyota.com' : 'e.g. branch-code'}
                  className="h-16 rounded-2xl border-2 border-[#cbd0d8] bg-[#f8f9fb] px-5 text-lg font-semibold shadow-none placeholder:font-normal placeholder:text-[#9aa1ad] focus-visible:border-[#eb0a1e] focus-visible:ring-4 focus-visible:ring-[#eb0a1e]/15"
                />
              </div>

              {admin && (
                <div className="space-y-2.5">
                  <label className="text-sm font-bold" htmlFor="secret">Admin password</label>
                  <PasswordInput
                    id="secret"
                    name="secret"
                    autoComplete="current-password"
                    required
                    className="h-16 rounded-2xl border-2 border-[#cbd0d8] bg-[#f8f9fb] px-5 text-lg font-semibold shadow-none placeholder:font-normal placeholder:text-[#9aa1ad] focus-visible:border-[#eb0a1e] focus-visible:ring-4 focus-visible:ring-[#eb0a1e]/15"
                  />
                </div>
              )}

              {message && (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-[#f2b8bd] bg-[#fff1f2] p-4 text-sm font-semibold leading-5 text-[#b4232c]">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{message}</span>
                </div>
              )}

              <Button type="submit" className="h-16 w-full rounded-2xl border-2 border-[#b60718] bg-[#eb0a1e] text-base font-bold text-white shadow-[0_4px_0_#b60718] transition-transform hover:bg-[#d9091b] hover:shadow-[0_3px_0_#b60718] active:translate-y-1 active:shadow-none">
                <span>{admin ? 'Open admin workspace' : 'Open branch workspace'}</span>
                <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              </Button>
            </form>

            <div className="mt-8 border-t-2 border-[#eef0f3] pt-6 text-sm text-[#69707c]">
              {admin ? (
                <p>Need branch access? <Link className="font-bold text-[#eb0a1e] underline-offset-4 hover:underline" href="/login">Use the branch login <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></Link></p>
              ) : (
                <p>Managing the network? <Link className="font-bold text-[#eb0a1e] underline-offset-4 hover:underline" href="/admin/login">Use admin access <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></Link></p>
              )}
              <p className="mt-3 text-xs leading-5 text-[#9298a3]">Access is limited to Nippon Toyota maintenance teams. Your session stays scoped to the account you sign in with.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
