'use client'

import { useState, useTransition } from 'react'
import { createBranchAccount, rotateBranchCode } from '@/app/actions/maintenance'

type Branch = { id: string; name: string; is_active: boolean; account: { id: string; is_active: boolean } | null }

export function BranchManagement({ branches }: { branches: Branch[] }) {
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [result, setResult] = useState('')
  const [pending, startTransition] = useTransition()
  const save = (branchId: string, rotate: boolean) => startTransition(async () => {
    const code = codes[branchId] || undefined
    const response = rotate ? await rotateBranchCode({ branchId, code }) : await createBranchAccount({ branchId, code })
    if (response.success) { setResult(`${response.code} is the new code. Share it securely with ${branches.find((item) => item.id === branchId)?.name}.`); setCodes((current) => ({ ...current, [branchId]: '' })) }
    else setResult(response.error)
  })
  return <div className="mt-6 space-y-3">{branches.map((branch) => <article key={branch.id} className="flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">{branch.name}</h2><p className="text-sm text-slate-500">{branch.account?.is_active ? 'Account active' : 'No active account'}</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={codes[branch.id] || ''} onChange={(event) => setCodes((current) => ({ ...current, [branch.id]: event.target.value }))} placeholder="Optional code" className="h-9 border border-slate-300 px-2 text-sm" /><button disabled={pending} onClick={() => save(branch.id, Boolean(branch.account))} className="bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{branch.account ? 'Rotate code' : 'Create account'}</button></div></article>)}{result && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>}</div>
}
