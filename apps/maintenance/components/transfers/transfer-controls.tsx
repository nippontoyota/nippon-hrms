'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptTicketTransfer, rejectTicketTransfer } from '@/app/actions/maintenance'

export function TransferDecision({ transferId }: { transferId: string }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const decide = (accept: boolean) => startTransition(async () => {
    setError('')
    try {
      const result = accept ? await acceptTicketTransfer({ transferId, reason }) : await rejectTicketTransfer({ transferId, reason })
      if (!result.success) setError(result.error)
      else { setReason(''); router.refresh() }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update the transfer.')
    }
  })
  return <div className="space-y-2"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional response" className="h-9 w-full border border-slate-300 px-2 text-sm" /><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => decide(true)} className="bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Accept</button><button type="button" disabled={pending} onClick={() => decide(false)} className="bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50">Reject</button></div>{error && <p role="alert" className="text-xs text-red-600">{error}</p>}</div>
}
