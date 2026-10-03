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
  return <div className="min-h-full min-w-0 overflow-x-clip bg-white pb-16">
    <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/tickets" className="hidden md:inline-flex h-9 items-center justify-center gap-2 bg-red-600 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-sm"><ArrowLeft className="h-3.5 w-3.5" /> Back to queue</Link><div className="mt-5 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Maintenance ticket</p><h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950">{ticket.ticket_number}</h1><p className="mt-1 text-sm text-slate-700">Created {format(ticket.created_at, 'dd MMM yyyy, h:mm a')}</p></div><div className="shrink-0 flex items-center gap-3"><span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${getStatusColor(status)}`}>{status}</span>{ticket.status === 'CLOSED' ? <ReopenTicketButton ticketId={ticket.id} canReopen={session.role === 'ADMIN'} /> : <CloseTicketButton ticketId={ticket.id} />}</div></div></div></header>
    <main className="mx-auto grid min-w-0 max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[300px_minmax(0,1fr)_300px] lg:grid-cols-[250px_minmax(0,1fr)_250px] sm:px-8">
      <aside className="min-w-0 space-y-5">
        <section className="border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Activity Timeline</h2>
          <div className="mt-6">
            {ticket.activities.length === 0 && ticket.status_history.length === 0 && (
              <p className="text-sm text-slate-700">No activity recorded yet.</p>
            )}
            <ul role="list" className="space-y-6">
              {[...ticket.activities.map((item) => ({ id: item.id, date: item.created_at, title: item.detail, actor: item.actor })), ...ticket.status_history.map((item) => ({ id: item.id, date: item.created_at, title: `Status: ${item.status.replaceAll('_', ' ')}`, actor: item.notes || 'System' }))].sort((a, b) => b.date.getTime() - a.date.getTime()).map((item, index, arr) => {
                const isCuid = item.actor?.length === 25 && item.actor?.startsWith('c');
                const displayActor = isCuid ? 'Staff Member' : (item.actor || 'System');
                const isLast = index === arr.length - 1;
                return (
                  <li key={item.id} className="relative flex gap-x-4">
                    <div className={`absolute left-0 top-0 flex w-6 justify-center ${isLast ? 'h-6' : '-bottom-6'}`}>
                      <div className="w-px bg-emerald-200" />
                    </div>
                    <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    </div>
                    <div className="flex-auto py-0.5">
                      <p className="break-words text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 break-words text-xs font-medium text-slate-500">
                        {format(item.date, 'dd MMM, h:mm a')} · {displayActor}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="relative min-w-0 border-[3px] border-dashed border-red-400 bg-red-100/50 p-5 shadow-sm sm:p-8 rounded-2xl">
        <div className="absolute top-[45%] -left-5 h-8 w-8 -translate-y-1/2 rounded-full bg-white shadow-[inset_-3px_0_0_rgba(248,113,113,0.5)] border-r border-red-200"></div>
        <div className="absolute top-[45%] -right-5 h-8 w-8 -translate-y-1/2 rounded-full bg-white shadow-[inset_3px_0_0_rgba(248,113,113,0.5)] border-l border-red-200"></div>
<div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Ticket</h2><p className="mt-1 text-sm text-slate-700">Everything submitted through WhatsApp stays attached to this ticket.</p></div></div><hr className="my-6 border-[1.5px] border-dashed border-red-200" /><div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Reporter</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><UserRound className="h-4 w-4 shrink-0 text-slate-600" />{ticket.reporter_name || 'Name not provided'}</p><p className="mt-1 flex min-w-0 items-center gap-2 break-words text-sm text-slate-600"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.source_phone || 'Phone not provided'}</p></div><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Location</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><MapPin className="h-4 w-4 shrink-0 text-slate-600" />{ticket.location.name}</p><p className="mt-1 text-sm text-slate-600">{ticket.category.name}</p></div></div><div className="mt-5 min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Description</p><p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p></div>
{ticket.image_url && (
  <div className="mt-5 min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Attached Image</p>
    <div className="mt-2 border border-slate-200 bg-white p-2 shadow-sm">
      <img src={ticket.image_url} alt="Ticket attachment" className="w-full h-auto object-contain max-h-[400px]" loading="lazy" />
    </div>
  </div>
)}
</section>
      </div>

      <aside className="min-w-0 space-y-5">
        <section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Assign</h2><p className="mt-1 text-sm text-slate-700">Search and assign an employee.</p><div className="mt-5"><EmployeeAssignment ticketId={ticket.id} currentAssignee={ticket.assignee ? { id: ticket.assignee.normalized_name, name: ticket.assignee.name } : null} disabled={ticket.status === 'CLOSED'} /></div></section>
        
        <div className="min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === 'CLOSED'} /></div>
      </aside>
    </main>
  </div>
}
