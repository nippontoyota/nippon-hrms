'use client'

import { useState, useTransition } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, MapPin, Phone, UserRound, Trash2 } from 'lucide-react'
import { normalizeMaintenanceBranchName } from '@/lib/maintenance-branches'
import { deleteTicket } from '@/app/actions/maintenance'

const Link = (props: React.ComponentProps<typeof NextLink>) => <NextLink prefetch={false} {...props} />

export type QueueTicket = {
  id: string
  ticket_number: string
  status: string
  description: string
  reporter_name?: string | null
  source_phone?: string | null
  created_at: Date
  location: { name: string }
  category: { name: string }
  branch: { name: string } | null
  assigneeName: string | null
  totalCost: number | null
}

const statusLabels: Record<string, string> = { NEW: 'New', UNDER_REVIEW: 'Under review', PENDING_INFORMATION: 'Pending information', MATERIALS_ADDED: 'Materials added', PENDING_APPROVAL: 'Pending approval', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CLOSED: 'Closed' }
const statusStyles: Record<string, string> = { NEW: 'border-emerald-200 bg-emerald-50 text-emerald-700', IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700', COMPLETED: 'border-blue-200 bg-blue-50 text-blue-700', CLOSED: 'border-red-200 bg-red-50 text-red-700' }

function branchName(ticket: QueueTicket) {
  return ticket.branch ? normalizeMaintenanceBranchName(ticket.branch.name) : 'Unassigned branch'
}

function SortLink({ label, sort, activeSort, direction, params }: { label: string; sort: string; activeSort: string; direction: string; params: string }) {
  const nextDirection = activeSort === sort && direction === 'asc' ? 'desc' : 'asc'
  const Icon = activeSort === sort && direction === 'desc' ? ArrowDown : ArrowUp
  const query = new URLSearchParams(params)
  query.set('sort', sort)
  query.set('direction', nextDirection)
  query.delete('page')
  return <Link href={`?${query.toString()}`} className="inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500">{label}{activeSort === sort && <Icon className="h-3 w-3" aria-hidden="true" />}</Link>
}

function TicketSummary({ ticket, isAdmin, onDelete }: { ticket: QueueTicket, isAdmin?: boolean, onDelete?: (e: React.MouseEvent, id: string) => void }) {
  const statusLabel = statusLabels[ticket.status] ?? ticket.status.replaceAll('_', ' ')
  return <>
    <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{ticket.ticket_number}</p><p className="mt-1 text-xs text-slate-700">{ticket.created_at.toLocaleDateString('en-IN')} · {ticket.created_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p></div><div className="flex items-center gap-2"><span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>{statusLabel}</span>{onDelete && <button type="button" onClick={(e) => onDelete(e, ticket.id)} className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-sm bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"><Trash2 className="h-4 w-4" /></button>}</div></div>
    <h3 className="mt-3 font-semibold leading-5 text-slate-900">{ticket.description}</h3>
    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-red-700">{branchName(ticket)}</p>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.location.name}</span><span className="flex items-start gap-1.5"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.reporter_name || 'Name not provided'}</span><span className="flex items-start gap-1.5"><Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.source_phone || 'Phone not provided'}</span><span className="font-semibold text-slate-700">{ticket.assigneeName ?? 'Unassigned'}</span></div>
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-700">{ticket.category.name}</span></div>
  </>
}

export function TicketTable({ tickets, sort, direction, params, isAdmin }: { tickets: QueueTicket[]; sort: string; direction: string; params: string; isAdmin?: boolean }) {
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [isDeleting, startTransition] = useTransition();

  const router = useRouter()
  const openTicket = (ticketId: string) => router.push(`/tickets/${ticketId}`)
  const initiateDelete = (event: React.MouseEvent, ticketId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDeletingTicketId(ticketId);
  }

  const confirmDelete = () => {
    if (!deletingTicketId) return;
    startTransition(async () => {
      const result = await deleteTicket(deletingTicketId);
      if (!result.success) alert(result.error);
      setDeletingTicketId(null);
    });
  }
  const rowProps = (ticket: QueueTicket) => ({ tabIndex: 0, role: 'link' as const, 'aria-label': `Open ${ticket.ticket_number}`, onClick: () => openTicket(ticket.id), onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTicket(ticket.id) } } })
  return <>
    <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1160px] border-collapse text-left"><caption className="sr-only">Maintenance ticket queue</caption><thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700"><tr><th scope="col" className="px-4 py-3"><SortLink label="Ticket" sort="created" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3">Issue</th><th scope="col" className="px-4 py-3">Branch</th><th scope="col" className="px-4 py-3">Location / category</th><th scope="col" className="px-4 py-3">Reporter</th><th scope="col" className="px-4 py-3"><SortLink label="Owner" sort="assignee" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3"><SortLink label="Status" sort="status" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-200">{tickets.map((ticket) => { const statusLabel = statusLabels[ticket.status] ?? ticket.status.replaceAll('_', ' '); return <tr key={ticket.id} {...rowProps(ticket)} className="group cursor-pointer bg-white align-top hover:bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"><td className="px-4 py-4"><Link href={`/tickets/${ticket.id}`} className="block focus:outline-none focus:ring-2 focus:ring-red-500"><span className="font-bold text-slate-950 group-hover:text-red-600">{ticket.ticket_number}</span><time dateTime={ticket.created_at.toISOString()} className="mt-1 block whitespace-nowrap text-xs text-slate-700">{ticket.created_at.toLocaleDateString('en-IN')}<br />{ticket.created_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time></Link></td><td className="max-w-[250px] px-4 py-4"><Link href={`/tickets/${ticket.id}`} className="font-semibold text-slate-800 hover:text-red-600 focus:outline-none focus:underline">{ticket.description}</Link></td><td className="px-4 py-4 text-sm font-bold text-red-700">{branchName(ticket)}</td><td className="px-4 py-4 text-sm text-slate-700"><span className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-slate-600" />{ticket.location.name}</span><span className="mt-1 block text-xs text-slate-700">{ticket.category.name}</span></td><td className="px-4 py-4 text-sm text-slate-700"><span className="flex items-center gap-1.5"><UserRound className="h-4 w-4 text-slate-600" />{ticket.reporter_name || 'Name not provided'}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-700"><Phone className="h-3 w-3" />{ticket.source_phone || 'Phone not provided'}</span></td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{ticket.assigneeName ?? <span className="font-medium text-slate-700">Unassigned</span>}</td><td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>{statusLabel}</span></td><td className="px-4 py-4 text-right"><button type="button" onClick={(e) => initiateDelete(e, ticket.id)} className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-sm bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"><Trash2 className="h-4 w-4" /></button></td></tr> })}</tbody></table></div>
    <div className="space-y-3 p-3 md:hidden">{tickets.map((ticket) => <div key={ticket.id} {...rowProps(ticket)} className="relative cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"><TicketSummary ticket={ticket} isAdmin={isAdmin} onDelete={initiateDelete} /></div>)}</div>

    {deletingTicketId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <h3 className="text-lg font-bold text-slate-900">Delete ticket</h3>
          <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this ticket? This action cannot be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={isDeleting} onClick={() => setDeletingTicketId(null)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400">Cancel</button>
            <button type="button" disabled={isDeleting} onClick={confirmDelete} className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Yes, delete'}</button>
          </div>
        </div>
      </div>
    )}
  </>
}
