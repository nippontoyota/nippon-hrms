'use client'

import { useState, useTransition } from 'react'
import { requestTicketTransfer } from '@/app/actions/maintenance'

type TransferTicket = { id: string; ticket_number: string; description: string; branch: { id: string; name: string } | null }
type TransferBranch = { id: string; name: string }

export function TransferLauncher({ tickets, branches }: { tickets: TransferTicket[]; branches: TransferBranch[] }) {
  const [ticketId, setTicketId] = useState('')
  const [destinationBranchId, setDestinationBranchId] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const selectedTicket = tickets.find((ticket) => ticket.id === ticketId)
  const destinations = branches.filter((branch) => branch.id !== selectedTicket?.branch?.id)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await requestTicketTransfer({ ticketId, destinationBranchId, reason })
      setMessage(result.success ? 'Transfer request sent. The destination branch must accept it.' : result.error)
      if (result.success) { setTicketId(''); setDestinationBranchId(''); setReason('') }
    })
  }

  if (!tickets.length) return <div className="mt-6 border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No open tickets are currently available to transfer.</div>

  return <section className="mt-6 border border-red-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold text-slate-950">Start a transfer</h2><p className="mt-1 text-sm text-slate-600">Choose a ticket and destination. The destination branch must accept before ownership changes.</p></div><form onSubmit={submit} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div className="space-y-4"><div><label htmlFor="transfer-ticket" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Ticket</label><select id="transfer-ticket" required value={ticketId} onChange={(event) => { setTicketId(event.target.value); setDestinationBranchId('') }} disabled={pending} className="mt-2 h-11 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"><option value="">Choose a ticket</option>{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticket_number} · {ticket.branch?.name || 'Unassigned'} · {ticket.description}</option>)}</select></div><div><label htmlFor="transfer-reason" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Reason</label><textarea id="transfer-reason" required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} placeholder="Why should another branch handle it?" className="mt-2 min-h-20 w-full border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></div></div><div className="flex flex-col justify-between gap-4"><div><label htmlFor="transfer-destination" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Destination branch</label><select id="transfer-destination" required value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)} disabled={pending || !selectedTicket} className="mt-2 h-11 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"><option value="">Choose a destination</option>{destinations.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><button type="submit" disabled={pending} className="h-11 bg-[#eb0a1e] px-4 text-sm font-bold text-white transition hover:bg-[#d9091b] disabled:opacity-50">{pending ? 'Sending request...' : 'Request transfer'}</button></div></form>{message && <p role="status" className="mt-4 text-sm font-semibold text-slate-700">{message}</p>}</section>
}
