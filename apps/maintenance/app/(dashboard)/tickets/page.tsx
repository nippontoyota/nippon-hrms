import prisma from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckCircle2, CircleDot, ImageIcon, MapPin, Search } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { TicketsToggle } from './tickets-toggle'
import { TicketStatusControl } from './ticket-status-control'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const resolvedStatuses = ['COMPLETED' as const, 'CLOSED' as const]

export default async function TicketsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const status = searchParams.status === 'resolved' ? 'resolved' : 'pending'
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const requestedPage = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 25
  const statusFilter: Prisma.TicketWhereInput['status'] = status === 'resolved' ? { in: resolvedStatuses } : { notIn: resolvedStatuses }
  const where: Prisma.TicketWhereInput = { status: statusFilter }

  if (query) {
    where.OR = [
      { ticket_number: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { reporter_name: { contains: query, mode: 'insensitive' } },
      { location: { name: { contains: query, mode: 'insensitive' } } },
      { category: { name: { contains: query, mode: 'insensitive' } } },
    ]
  }

  const [tickets, openCount, resolvedCount] = await Promise.all([
    prisma.ticket.findMany({ where, include: { location: true, category: true }, orderBy: { created_at: 'desc' }, take: pageSize + 1, skip: (page - 1) * pageSize }),
    prisma.ticket.count({ where: { status: { notIn: resolvedStatuses } } }),
    prisma.ticket.count({ where: { status: { in: resolvedStatuses } } }),
  ])
  const hasNextPage = tickets.length > pageSize
  const visibleTickets = hasNextPage ? tickets.slice(0, pageSize) : tickets
  const pageLink = (nextPage: number) => `?status=${status}&q=${encodeURIComponent(query)}&page=${nextPage}`

  return (
    <PageTransition className="pb-12">
      <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">Operations / Maintenance</p><h1 className="text-2xl font-bold tracking-tight text-slate-950">Maintenance queue</h1><p className="mt-1 text-sm text-slate-500">Triage incoming issues, update work status, and keep the floor moving.</p></div>
          <div className="hidden items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex"><CircleDot className="h-3.5 w-3.5 fill-current" /> System operational</div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-5 px-5 py-5 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Link href="/tickets?status=pending" className={`border bg-white p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${status === 'pending' ? 'border-red-500' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Open queue</span><AlertTriangle className="h-4 w-4 text-amber-500" /></div><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{openCount}</p></Link>
          <Link href="/tickets?status=resolved" className={`border bg-white p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${status === 'resolved' ? 'border-red-500' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Resolved</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{resolvedCount}</p></Link>
        </div>
        <TicketsToggle currentStatus={status} />
        <form method="get" className="relative max-w-2xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="hidden" name="status" value={status} /><input name="q" defaultValue={query} type="search" placeholder="Search ticket, issue, location, or reporter" className="h-11 w-full border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" /></form>
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm" aria-label="Maintenance tickets">
          <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid"><span>Issue</span><span>Work status</span><span>Action</span></div>
          {visibleTickets.map((ticket) => {
            const isResolved = resolvedStatuses.includes(ticket.status as typeof resolvedStatuses[number])
            const priorityClass = ticket.priority === 'EMERGENCY' ? 'border-red-200 bg-red-50 text-red-700' : ticket.priority === 'HIGH' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'
            const statusLabel = ticket.status === 'COMPLETED' ? 'Resolved' : ticket.status === 'CLOSED' ? 'Closed' : ticket.status.replaceAll('_', ' ')
            const ticketNum = ticket.ticket_number.split('-').pop() || ticket.ticket_number
            return <div key={ticket.id} className="grid gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1fr)_150px_150px] md:items-center">
              <div className="flex min-w-0 gap-3"><Link href={`/tickets/${ticket.id}`} aria-label={`Open ticket ${ticket.ticket_number}`} className="h-16 w-16 shrink-0 overflow-hidden border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500">{ticket.image_url ? <img src={ticket.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase text-slate-400"><ImageIcon className="h-4 w-4" /> No photo</span>}</Link><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/tickets/${ticket.id}`} className="font-bold text-slate-950 hover:text-red-600 focus:outline-none focus:underline">{ticketNum}</Link><span className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityClass}`}>{ticket.priority === 'EMERGENCY' ? 'Urgent' : ticket.priority}</span></div><p className="mt-1 truncate text-sm font-semibold text-slate-800">{ticket.category.name} · {ticket.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ticket.location.name}</span><span>{ticket.reporter_name}</span><span>{ticket.source_phone}</span><span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span></div></div></div>
              <span className={`inline-flex w-fit items-center border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${isResolved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{statusLabel}</span>
              <div className="flex items-center justify-between gap-3 md:justify-start"><Link href={`/tickets/${ticket.id}`} className="text-xs font-bold text-slate-500 hover:text-red-600 focus:outline-none focus:underline">View details</Link><TicketStatusControl ticketId={ticket.id} status={ticket.status} /></div>
            </div>
          })}
          {visibleTickets.length === 0 && <div className="px-5 py-16 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><h2 className="mt-3 font-bold text-slate-900">Queue is clear</h2><p className="mt-1 text-sm text-slate-500">No tickets match this view.</p></div>}
        </section>
        {(page > 1 || hasNextPage) && <div className="flex max-w-6xl items-center justify-between"><div>{page > 1 && <Link href={pageLink(page - 1)} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500">Previous</Link>}</div>{hasNextPage && <Link href={pageLink(page + 1)} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500">Next</Link>}</div>}
      </div>
    </PageTransition>
  )
}
