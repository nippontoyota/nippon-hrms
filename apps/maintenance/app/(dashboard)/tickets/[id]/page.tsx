import Link from 'next/link'
import { notFound } from 'next/navigation'

function getStatusColor(status: string) {
  switch (status) {
    case 'NEW': return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'CLOSED': return 'border-slate-200 bg-slate-100 text-slate-700'
    case 'IN PROGRESS': return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'REJECTED': return 'border-red-200 bg-red-50 text-red-700'
    case 'APPROVED': return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'UNDER REVIEW': return 'border-purple-200 bg-purple-50 text-purple-700'
    default: return 'border-slate-300 bg-slate-50 text-slate-700'
  }
}

import { ArrowLeft, MapPin, Phone, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import prisma from '@/lib/prisma'
import { maintenanceTicketInclude, listMaintenanceAssignees } from '@/lib/maintenance'
import { listMaintenanceBranches } from '@/app/actions/maintenance'
import { formatInr } from '@/lib/format'
import { normalizeMaintenanceBranchName } from '@/lib/maintenance-branches'
import { CloseTicketButton, ReopenTicketButton } from '@/components/tickets/ticket-controls'
import { TotalCostForm } from '@/components/tickets/total-cost-form'
import { EmployeeAssignment } from '@/components/tickets/employee-assignment'

import { requireMaintenanceSession } from '@/lib/maintenance-auth'

export const dynamic = 'force-dynamic'

export default async function TicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireMaintenanceSession()
  const [ticket, branches] = await Promise.all([prisma.ticket.findFirst({ where: { id, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) }, include: maintenanceTicketInclude }), listMaintenanceBranches()])
  if (!ticket) notFound()
  const total = ticket.costs.reduce((sum, cost) => sum + Number(cost.amount), 0)
  const status = ticket.status.replaceAll('_', ' ')
  return <div className="min-h-full min-w-0 overflow-x-clip bg-[#f4f6fa] pb-16">
    <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/tickets" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 hover:text-red-600"><ArrowLeft className="h-3.5 w-3.5" /> Back to queue</Link><div className="mt-5 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Maintenance ticket</p><h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950">{ticket.ticket_number}</h1><p className="mt-1 text-sm text-slate-700">Created {format(ticket.created_at, 'dd MMM yyyy, h:mm a')}</p></div><div className="shrink-0"><span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${getStatusColor(status)}`}>{status}</span></div></div></div></header>
    <main className="mx-auto grid min-w-0 max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_300px] sm:px-8"><div className="min-w-0 space-y-5">
      <section className="min-w-0 border-2 border-dotted border-red-200 bg-red-50/50 p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Issue details</h2><p className="mt-1 text-sm text-slate-700">Everything submitted through WhatsApp stays attached to this ticket.</p></div></div><div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Reporter</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><UserRound className="h-4 w-4 shrink-0 text-slate-600" />{ticket.reporter_name || 'Name not provided'}</p><p className="mt-1 flex min-w-0 items-center gap-2 break-words text-sm text-slate-600"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.source_phone || 'Phone not provided'}</p></div><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Location</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><MapPin className="h-4 w-4 shrink-0 text-slate-600" />{ticket.location.name}</p><p className="mt-1 text-sm text-slate-600">{ticket.category.name}</p></div></div><div className="mt-5 min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Description</p><p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p><div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === 'CLOSED'} /></div></div></section>
    </div><aside className="min-w-0 space-y-5"><section className="border border-yellow-200 bg-yellow-50 p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Ownership</h2><p className="mt-1 text-sm text-slate-700">Search and assign an employee.</p><div className="mt-5"><EmployeeAssignment ticketId={ticket.id} currentAssignee={ticket.assignee ? { id: ticket.assignee.normalized_name, name: ticket.assignee.name } : null} disabled={ticket.status === 'CLOSED'} /></div></section><section className="border border-slate-200 bg-white p-5 shadow-sm">{ticket.status === 'CLOSED' ? <><h2 className="text-lg font-bold text-slate-950">Reopen ticket</h2><p className="mt-1 text-sm text-slate-700">Only an admin can reopen a closed ticket.</p><div className="mt-5"><ReopenTicketButton ticketId={ticket.id} canReopen={session.role === 'ADMIN'} /></div></> : <><h2 className="text-lg font-bold text-slate-950">Close ticket</h2><p className="mt-1 text-sm text-slate-700">Close only when the work is complete. Closed tickets remain searchable.</p><div className="mt-5"><CloseTicketButton ticketId={ticket.id} /></div></>}</section><section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Activity</h2><div className="mt-5 space-y-4">{ticket.activities.length === 0 && ticket.status_history.length === 0 && <p className="text-sm text-slate-700">No activity recorded yet.</p>}{[...ticket.activities.map((item) => ({ id: item.id, date: item.created_at, title: item.detail, actor: item.actor })), ...ticket.status_history.map((item) => ({ id: item.id, date: item.created_at, title: `Status: ${item.status.replaceAll('_', ' ')}`, actor: item.notes || 'System' }))].sort((a, b) => b.date.getTime() - a.date.getTime()).map((item) => <div key={item.id} className="border-l-2 border-red-200 pl-3"><p className="break-words text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 break-words text-xs text-slate-700">{format(item.date, 'dd MMM, h:mm a')} · {item.actor}</p></div>)}</div></section></aside></main>
  </div>
}
