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
    <div className="mt-5 flex flex-col">
      {result && <p role="status" className="mb-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{result}</p>}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b-2 border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          <span>Branch</span>
          <span>Current code</span>
          <span>New code</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-slate-100">
          {branches.map((branch) => {
            const hasAccount = Boolean(branch.account?.is_active)
            const currentCode = branch.account?.current_code
            return (
              <div key={branch.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><KeyRound className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black tracking-tight text-slate-950">{branch.name}</h2>
                    <p className="truncate text-xs font-medium text-slate-500">{hasAccount ? 'Account active' : 'No active account'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasAccount ? (
                    <>
                      <code className="rounded-lg border-2 border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-black tracking-[0.1em] text-slate-950">{currentCode || 'Unavailable'}</code>
                      {currentCode && <button type="button" onClick={() => copyCode(branch.id, currentCode)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={`Copy current code for ${branch.name}`}>
                        {copied === branch.id ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>}
                    </>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </div>

                <input aria-label={`${hasAccount ? 'New code' : 'Set a code'} for ${branch.name}`} value={codes[branch.id] || ''} onChange={(event) => setCodes((current) => ({ ...current, [branch.id]: event.target.value.toUpperCase() }))} placeholder="Leave blank to generate" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} className="h-8 min-w-0 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 text-xs font-bold tracking-wide text-slate-950 outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100" />

                <button type="button" disabled={pending} onClick={() => save(branch.id, hasAccount)} className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-black text-white shadow-[0_2px_0_#b91c1c] transition hover:bg-red-700 active:translate-y-px disabled:opacity-50">{hasAccount ? 'Change' : 'Create'}</button>
              </div>
            )
          })}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Use 5–12 letters or numbers. Changing a code immediately invalidates the old one.</p>
    </div>
  )
}
