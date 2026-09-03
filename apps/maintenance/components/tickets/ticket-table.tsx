import NextLink from 'next/link'
import { ArrowDown, ArrowUp, ImageIcon, MapPin, Phone, UserRound } from 'lucide-react'
import { formatInr } from '@/lib/format'

const Link = (props: React.ComponentProps<typeof NextLink>) => <NextLink prefetch={false} {...props} />

export type QueueTicket = {
  id: string
  ticket_number: string
  status: string
  priority: string
  description: string
  reporter_name?: string | null
  source_phone?: string | null
  image_url?: string | null
  created_at: Date
  location: { name: string }
  category: { name: string }
  assigneeName: string | null
  totalCost: number | null
}

const statusLabels: Record<string, string> = { NEW: 'New', UNDER_REVIEW: 'Under review', PENDING_INFORMATION: 'Pending information', MATERIALS_ADDED: 'Materials added', PENDING_APPROVAL: 'Pending approval', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CLOSED: 'Closed' }
const statusStyles: Record<string, string> = { CLOSED: 'border-slate-300 bg-slate-100 text-slate-700', COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700', IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700' }

function SortLink({ label, sort, activeSort, direction, params }: { label: string; sort: string; activeSort: string; direction: string; params: string }) {
  const nextDirection = activeSort === sort && direction === 'asc' ? 'desc' : 'asc'
  const Icon = activeSort === sort && direction === 'desc' ? ArrowDown : ArrowUp
  return <Link href={`?${params}&sort=${sort}&direction=${nextDirection}`} className="inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500">{label}{activeSort === sort && <Icon className="h-3 w-3" aria-hidden="true" />}</Link>
}

export function TicketTable({ tickets, sort, direction, params }: { tickets: QueueTicket[]; sort: string; direction: string; params: string }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-left"><caption className="sr-only">Maintenance ticket queue</caption><thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><tr><th scope="col" className="px-4 py-3"><SortLink label="Ticket" sort="created" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3">Issue</th><th scope="col" className="px-4 py-3">Location / category</th><th scope="col" className="px-4 py-3">Reporter</th><th scope="col" className="px-4 py-3"><SortLink label="Owner" sort="assignee" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3"><SortLink label="Status" sort="status" activeSort={sort} direction={direction} params={params} /></th><th scope="col" className="px-4 py-3 text-right">Photo / cost</th></tr></thead><tbody className="divide-y divide-slate-200">{tickets.map((ticket) => { const statusLabel = statusLabels[ticket.status] ?? ticket.status.replaceAll('_', ' '); return <tr key={ticket.id} className="group bg-white align-top hover:bg-red-50/30"><td className="px-4 py-4"><Link href={`/tickets/${ticket.id}`} className="block focus:outline-none focus:ring-2 focus:ring-red-500"><span className="font-bold text-slate-950 group-hover:text-red-600">{ticket.ticket_number}</span><time dateTime={ticket.created_at.toISOString()} className="mt-1 block whitespace-nowrap text-xs text-slate-500">{ticket.created_at.toLocaleDateString('en-IN')}<br />{ticket.created_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time></Link></td><td className="max-w-[250px] px-4 py-4"><Link href={`/tickets/${ticket.id}`} className="font-semibold text-slate-800 hover:text-red-600 focus:outline-none focus:underline">{ticket.description}</Link><div className="mt-2 text-xs text-slate-500">{ticket.priority === 'EMERGENCY' ? 'Urgent' : ticket.priority}</div></td><td className="px-4 py-4 text-sm text-slate-700"><span className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-slate-400" />{ticket.location.name}</span><span className="mt-1 block text-xs text-slate-500">{ticket.category.name}</span></td><td className="px-4 py-4 text-sm text-slate-700"><span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-slate-400" />{ticket.reporter_name || 'Name not provided'}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3 w-3" />{ticket.source_phone || 'Phone not provided'}</span></td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{ticket.assigneeName ?? <span className="font-medium text-slate-500">Unassigned</span>}</td><td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>{statusLabel}</span></td><td className="px-4 py-4 text-right text-sm"><span className="inline-flex items-center gap-1.5 text-slate-600"><ImageIcon className="h-3.5 w-3.5" />{ticket.image_url ? 'Photo' : 'No photo'}</span><span className="mt-1 block whitespace-nowrap font-semibold tabular-nums text-slate-900">{ticket.totalCost === null ? 'Not recorded' : formatInr(ticket.totalCost)}</span></td></tr> })}</tbody></table><div className="space-y-3 p-4 md:hidden"><p className="text-xs text-slate-500">Swipe horizontally to view all queue columns.</p></div></div>
}
