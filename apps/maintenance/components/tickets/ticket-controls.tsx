'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addAssignee, addTicketCost, assignTicket, closeTicket } from '@/app/actions/maintenance'

export function AssignmentControl({ ticketId, currentAssigneeId, assignees }: { ticketId: string; currentAssigneeId: string | null; assignees: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const router = useRouter()
  const submit = (assigneeId: string | null) => { setError(''); startTransition(async () => { const result = await assignTicket({ ticketId, assigneeId }); if (!result.success) setError(result.error); else router.refresh() }) }
  const add = () => { setError(''); startTransition(async () => { const result = await addAssignee({ name }); if (!result.success) setError(result.error); else { setName(''); setAdding(false); router.refresh() } }) }
  return <div className="space-y-3">
    <div className="flex gap-2">
      <select aria-label="Assign ticket" disabled={isPending} value={currentAssigneeId ?? ''} onChange={(event) => submit(event.target.value || null)} className="h-10 min-w-0 flex-1 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100">
        <option value="">Unattended</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select>
      <button type="button" onClick={() => setAdding(!adding)} className="h-10 shrink-0 border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500">Add person</button>
    </div>
    {adding && <div className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Person's name" className="h-10 min-w-0 flex-1 border border-slate-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" /><button type="button" disabled={isPending || !name.trim()} onClick={add} className="h-10 bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40">Save</button></div>}
    {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
  </div>
}

export function CostForm({ ticketId, type }: { ticketId: string; type: 'MATERIAL' | 'LABOUR' }) {
  const [isPending, startTransition] = useTransition(); const [description, setDescription] = useState(''); const [amount, setAmount] = useState(''); const [error, setError] = useState(''); const router = useRouter()
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); startTransition(async () => { const result = await addTicketCost({ ticketId, type, description, amount }); if (!result.success) setError(result.error); else { setDescription(''); setAmount(''); router.refresh() } }) }
  return <form onSubmit={submit} className="space-y-2"><div className="flex gap-2"><input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === 'MATERIAL' ? 'Material name' : 'Labour description'} className="h-10 min-w-0 flex-1 border border-slate-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" /><input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="₹ amount" className="h-10 w-28 border border-slate-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" /><button disabled={isPending} className="h-10 bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">Add</button></div>{error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}</form>
}

export function CloseTicketButton({ ticketId, disabled }: { ticketId: string; disabled?: boolean }) { const [isPending, startTransition] = useTransition(); const [error, setError] = useState(''); const router = useRouter(); const close = () => { if (!window.confirm('Close this ticket? You can still view it later, but new costs and assignment changes will be locked.')) return; startTransition(async () => { const result = await closeTicket({ ticketId }); if (!result.success) setError(result.error); else router.refresh() }) }; return <div className="space-y-2"><button type="button" disabled={disabled || isPending} onClick={close} className="h-11 w-full bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">{isPending ? 'Closing…' : disabled ? 'Ticket closed' : 'Close ticket'}</button>{error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}</div> }
