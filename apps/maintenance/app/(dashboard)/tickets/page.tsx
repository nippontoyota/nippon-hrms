import prisma from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Search, MapPin } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { TicketsToggle } from './tickets-toggle'

export const dynamic = 'force-dynamic'

export default async function TicketsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  try {
    const searchParams = await props.searchParams
    const status = searchParams.status === 'resolved' ? 'resolved' : 'pending'

    const tickets = await prisma.ticket.findMany({
      where: {
        status: status === 'resolved' 
          ? { in: ['COMPLETED', 'CLOSED'] }
          : { notIn: ['COMPLETED', 'CLOSED'] }
      },
      include: {
        location: true,
        category: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return (
      <PageTransition className="pb-24">
        {/* Header Area */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pt-4 pb-4 px-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            {/* We rely on global Header, so just a subtle title here or we can recreate the top bar */}
            <h2 className="text-xl font-bold tracking-tight text-center flex-1">Tickets</h2>
          </div>

          {/* Toggle */}
          <TicketsToggle currentStatus={status} />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
            <input 
              type="search" 
              placeholder="Search by ID, location, or reporter..." 
              className="w-full h-12 bg-white border border-slate-200 shadow-sm rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-3 px-4 pt-4 max-w-2xl mx-auto">
          {tickets.map((ticket) => {
            const isEmergency = ticket.priority === 'EMERGENCY'
            const isHigh = ticket.priority === 'HIGH'
            const isMedium = ticket.priority === 'MEDIUM'
            
            let stripColor = 'bg-slate-400'
            let priorityBg = 'bg-slate-100'
            let priorityText = 'text-slate-600'
            
            if (isEmergency) {
              stripColor = 'bg-red-600'
              priorityBg = 'bg-red-600'
              priorityText = 'text-white'
            } else if (isHigh) {
              stripColor = 'bg-amber-500'
              priorityBg = 'bg-amber-100'
              priorityText = 'text-amber-700'
            } else if (isMedium) {
              stripColor = 'bg-blue-500'
              priorityBg = 'bg-blue-100'
              priorityText = 'text-blue-700'
            }

            const statusBg = ticket.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'

            // Get numeric part of ticket
            const ticketNum = ticket.ticket_number.split('-')[2] || ticket.ticket_number

            return (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                <div className="relative bg-card rounded-xl p-4 flex flex-col gap-3 overflow-hidden shadow-sm hover:shadow-md hover:bg-slate-50 transition-all border border-border group">
                  {/* Left Colored Edge Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripColor}`}></div>
                  
                  {/* Top Row: Icon + Number + Badges */}
                  <div className="flex justify-between items-center pl-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                      </div>
                      <span className="font-extrabold text-[17px] text-slate-800 tracking-wide">{ticketNum}</span>
                    </div>
                    <div className="flex gap-2">
                      {ticket.status !== 'COMPLETED' && (
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${priorityBg} ${priorityText}`}>
                          {ticket.priority === 'EMERGENCY' ? 'Urgent' : ticket.priority}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${statusBg}`}>
                        {ticket.status === 'COMPLETED' ? 'Closed' : 'Open'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content Row */}
                  <div className="pl-2 mt-1">
                    <h3 className="font-semibold text-[15px] leading-tight text-slate-900 group-hover:text-red-600 transition-colors">
                      {ticket.category.name} - {ticket.description.substring(0, 45)}{ticket.description.length > 45 ? '...' : ''}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">{ticket.location.name}</p>
                    </div>
                  </div>
                  
                  {/* Bottom Row: Time and Avatars */}
                  <div className="flex justify-between items-center pl-2 mt-2 pt-3 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </p>
                    
                    {/* Avatar Stack */}
                    <div className="flex -space-x-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase shadow-sm">
                        {ticket.reporter_name.substring(0,2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {tickets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tickets found.
            </div>
          )}
        </div>
      </PageTransition>
    )
  } catch (error: any) {
    return (
      <div className="p-8 mt-20 border border-red-500 bg-red-50 text-red-900 max-w-2xl mx-auto rounded-lg break-all">
        <h2 className="text-xl font-bold mb-4">Server Error Details (Debug)</h2>
        <pre className="whitespace-pre-wrap text-sm">{error?.message || String(error)}</pre>
        {error?.stack && <pre className="whitespace-pre-wrap text-xs mt-4 text-red-700/80">{error.stack}</pre>}
      </div>
    )
  }
}
