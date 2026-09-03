import NextLink from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { PageTransition } from '@/components/ui/page-transition'
import { TicketTable, type QueueTicket } from '@/components/tickets/ticket-table'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1'

const Link = (props: React.ComponentProps<typeof NextLink>) => <NextLink prefetch={false} {...props} />
type Queue = 'open' | 'assigned' | 'unattended' | 'closed'
const queueLabels: Record<Queue, string> = { open: 'Open', assigned: 'Assigned', unattended: 'Unattended', closed: 'Closed' }
const queueFor = (value: string | string[] | undefined): Queue => ['open', 'assigned', 'unattended', 'closed'].includes(String(value)) ? String(value) as Queue : 'open'

function queueWhere(queue: Queue): Prisma.TicketWhereInput {
  if (queue === 'closed') return { status: 'CLOSED' }
  if (queue === 'assigned') return { status: { not: 'CLOSED' }, assignee_id: { not: null } }
  if (queue === 'unattended') return { status: { not: 'CLOSED' }, assignee_id: null }
  return { status: { not: 'CLOSED' } }
}

function combine(...conditions: Prisma.TicketWhereInput[]): Prisma.TicketWhereInput { return { AND: conditions } }

export default async function TicketsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const queue = queueFor(searchParams.queue ?? searchParams.status)
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const sort = ['created', 'status', 'assignee'].includes(String(searchParams.sort)) ? String(searchParams.sort) as 'created' | 'status' | 'assignee' : 'created'
  const direction: Prisma.SortOrder = searchParams.direction === 'asc' ? 'asc' : 'desc'
  const requestedPage = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 25
  const searchWhere: Prisma.TicketWhereInput = query ? { OR: [
    { ticket_number: { contains: query, mode: 'insensitive' } },
    { description: { contains: query, mode: 'insensitive' } },
    { reporter_name: { contains: query, mode: 'insensitive' } },
    { source_phone: { contains: query, mode: 'insensitive' } },
    { location: { name: { contains: query, mode: 'insensitive' } } },
    { category: { name: { contains: query, mode: 'insensitive' } } },
    { assignee: { name: { contains: query, mode: 'insensitive' } } },
  ] } : {}
  const baseWhere = combine(searchWhere)
  const selectedOrder: Prisma.TicketOrderByWithRelationInput = sort === 'created'
    ? { created_at: direction }
    : sort === 'status'
      ? { status: direction }
      : { assignee: { name: direction } }
  const [rawTickets, open, assigned, unattended, closed] = await Promise.all([
    prisma.ticket.findMany({
      where: combine(baseWhere, queueWhere(queue)),
      include: { location: true, category: true, materials: true, assignee: true, costs: true },
      orderBy: [selectedOrder, { created_at: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    }),
    prisma.ticket.count({ where: combine(baseWhere, queueWhere('open')) }),
    prisma.ticket.count({ where: combine(baseWhere, queueWhere('assigned')) }),
    prisma.ticket.count({ where: combine(baseWhere, queueWhere('unattended')) }),
    prisma.ticket.count({ where: combine(baseWhere, queueWhere('closed')) }),
  ])
  const hasNextPage = rawTickets.length > pageSize
  const pageTickets = hasNextPage ? rawTickets.slice(0, pageSize) : rawTickets
  const rows: QueueTicket[] = pageTickets.map((ticket) => {
    const recordedCosts = ticket.costs.reduce((total, cost) => total + Number(cost.amount), 0)
    const legacyMaterialCost = ticket.materials.reduce((total, material) => total + material.quantity * Number(material.unit_cost_at_time), 0)
    return { ...ticket, assigneeName: ticket.assignee?.name ?? null, totalCost: recordedCosts || legacyMaterialCost || null }
  })
  const counts = { open, assigned, unattended, closed }
  const params = new URLSearchParams({ queue, ...(query ? { q: query } : {}), sort, direction }).toString()
  const pageLink = (nextPage: number) => `?${params}&page=${nextPage}`

  return <PageTransition className="pb-12"><div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8"><div className="mx-auto max-w-7xl"><h1 className="text-2xl font-bold tracking-tight text-slate-950">Maintenance queue</h1><p className="mt-1 text-sm text-slate-500">Review incoming work, find unattended tickets, and keep ownership clear.</p></div></div><div className="mx-auto max-w-7xl space-y-5 px-5 py-5 sm:px-8"><nav aria-label="Ticket filters" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(queueLabels) as Queue[]).map((key) => <Link key={key} href={`?queue=${key}${query ? `&q=${encodeURIComponent(query)}` : ''}`} className={`flex items-center justify-between border px-3 py-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${queue === key ? 'border-red-600 bg-red-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'}`}><span>{queueLabels[key]}</span><span className="tabular-nums opacity-75">{counts[key]}</span></Link>)}</nav><form method="get" className="flex flex-col gap-3 sm:flex-row"><input type="hidden" name="queue" value={queue} /><label className="relative min-w-0 flex-1"><span className="sr-only">Search tickets</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={query} type="search" placeholder="Search ticket, issue, location, reporter, or phone" className="h-11 w-full border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"><SlidersHorizontal className="h-4 w-4" />Apply filters</button></form><section className="overflow-hidden border border-slate-200 bg-white shadow-sm" aria-label="Maintenance tickets">{rows.length ? <TicketTable tickets={rows} sort={sort} direction={direction} params={params} /> : <div className="px-5 py-16 text-center"><h2 className="font-bold text-slate-900">{query ? 'No tickets match this search' : `${queueLabels[queue]} queue is clear`}</h2><p className="mt-1 text-sm text-slate-500">Try another filter or search term.</p></div>}</section>{(page > 1 || hasNextPage) && <div className="flex items-center justify-between"><div>{page > 1 && <Link href={pageLink(page - 1)} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500">Previous</Link>}</div>{hasNextPage && <Link href={pageLink(page + 1)} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500">Next</Link>}</div>}</div></PageTransition>
}
