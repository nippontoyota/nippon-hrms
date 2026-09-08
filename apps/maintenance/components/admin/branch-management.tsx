'use client'

import { Check, Copy, KeyRound } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createBranchAccount, rotateBranchCode } from '@/app/actions/maintenance'

type Branch = {
  id: string
  name: string
  is_active: boolean
  account: { id: string; is_active: boolean; current_code: string | null } | null
}

export function BranchManagement({ branches }: { branches: Branch[] }) {
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [pending, startTransition] = useTransition()

  const save = (branchId: string, hasAccount: boolean) => startTransition(async () => {
    const code = codes[branchId] || undefined
    const response = hasAccount ? await rotateBranchCode({ branchId, code }) : await createBranchAccount({ branchId, code })
    if (response.success) {
      const branch = branches.find((item) => item.id === branchId)
      setResult(`${response.code} is now the active code for ${branch?.name}. Share it securely with that branch.`)
      setCodes((current) => ({ ...current, [branchId]: '' }))
    } else {
      setResult(response.error)
    }
  })

  const copyCode = async (branchId: string, code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(branchId)
    window.setTimeout(() => setCopied((current) => current === branchId ? null : current), 1800)
  }

  return (
    <div className="mt-7 space-y-4">
      {branches.map((branch) => {
        const hasAccount = Boolean(branch.account?.is_active)
        const currentCode = branch.account?.current_code
        return (
          <article key={branch.id} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950">{branch.name}</h2>
                    <p className="text-sm font-medium text-slate-500">{hasAccount ? 'Account active' : 'No active account'}</p>
                  </div>
                </div>
                {hasAccount && (
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Current login code</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-base font-black tracking-[0.12em] text-slate-950">{currentCode || 'Unavailable'}</code>
                      {currentCode && <button type="button" onClick={() => copyCode(branch.id, currentCode)} className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={`Copy current code for ${branch.name}`}>
                        {copied === branch.id ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        <span className="hidden sm:inline">{copied === branch.id ? 'Copied' : 'Copy'}</span>
                      </button>}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm space-y-2 sm:pt-1">
                <label htmlFor={`new-code-${branch.id}`} className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{hasAccount ? 'New code' : 'Set a code'}</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id={`new-code-${branch.id}`} value={codes[branch.id] || ''} onChange={(event) => setCodes((current) => ({ ...current, [branch.id]: event.target.value.toUpperCase() }))} placeholder={hasAccount ? 'Leave blank to generate' : 'Leave blank to generate'} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} className="h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 text-sm font-bold tracking-wide text-slate-950 outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100" />
                  <button type="button" disabled={pending} onClick={() => save(branch.id, hasAccount)} className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-[0_3px_0_#b91c1c] transition hover:bg-red-700 active:translate-y-px disabled:opacity-50">{hasAccount ? 'Change code' : 'Create account'}</button>
                </div>
                <p className="text-xs leading-5 text-slate-500">Use 5–12 letters or numbers. Changing it immediately invalidates the old code.</p>
              </div>
            </div>
          </article>
        )
      })}
      {result && <p role="status" className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{result}</p>}
    </div>
  )
}
