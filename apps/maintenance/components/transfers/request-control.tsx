'use client'

import { useState, useTransition } from 'react'
import { requestTicketTransfer } from '@/app/actions/maintenance'

export function TransferRequest({ ticketId, branches, currentBranchId }: { ticketId: string; branches: { id: string; name: string }[]; currentBranchId: string | null }) {
  const [destinationBranchId, setDestinationBranchId] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); startTransition(async () => { const result = await requestTicketTransfer({ ticketId, destinationBranchId, reason }); setMessage(result.success ? 'Transfer request sent.' : result.error); if (result.success) { setDestinationBranchId(''); setReason('') } }) }
  return <form onSubmit={submit} className="space-y-3"><select required value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)} className="h-10 w-full border border-slate-300 bg-white px-2 text-sm"><option value="">Choose another branch</option>{branches.filter((branch) => branch.id !== currentBranchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><textarea required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why should this branch handle it?" className="min-h-20 w-full border border-slate-300 p-2 text-sm" /><button disabled={pending} className="bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'Sending...' : 'Request transfer'}</button>{message && <p role="status" className="text-sm text-slate-600">{message}</p>}</form>
}
