import prisma from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Search } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const tickets = await prisma.ticket.findMany({
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
          <Link href="/raise-ticket">
            <div className="h-10 w-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-white/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={2} />
            <input 
              type="search" 
              placeholder="Search" 
              className="w-full h-11 bg-[#121214] border-0 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-shadow"
            />
          </div>
          <button className="h-11 w-11 bg-[#121214] rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
          </button>
          <button className="h-11 w-11 bg-[#121214] rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4 max-w-2xl mx-auto">
        {tickets.map((ticket) => {
          const isEmergency = ticket.priority === 'EMERGENCY'
          const isHigh = ticket.priority === 'HIGH'
          const isMedium = ticket.priority === 'MEDIUM'
          
          let stripColor = 'bg-zinc-700'
          let priorityBg = 'bg-zinc-800'
          let priorityText = 'text-zinc-300'
          
          if (isEmergency) {
            stripColor = 'bg-red-500'
            priorityBg = 'bg-red-500'
            priorityText = 'text-white'
          } else if (isHigh) {
            stripColor = 'bg-amber-500'
            priorityBg = 'bg-amber-500/20'
            priorityText = 'text-amber-500'
          } else if (isMedium) {
            stripColor = 'bg-blue-500'
            priorityBg = 'bg-blue-500/20'
            priorityText = 'text-blue-400'
          }

          const statusBg = ticket.status === 'COMPLETED' ? 'bg-zinc-800 text-zinc-500' : 'bg-[#3A1D20] text-red-500'

          // Get numeric part of ticket
          const ticketNum = ticket.ticket_number.split('-')[2] || ticket.ticket_number

          return (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
              <div className="relative bg-[#121214] rounded-md p-4 flex flex-col gap-2 overflow-hidden hover:bg-[#161618] transition-colors">
                {/* Left Colored Edge Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripColor}`}></div>
                
                {/* Top Row: Icon + Number + Badges */}
                <div className="flex justify-between items-center pl-2">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <span className="font-bold text-[17px] text-white tracking-wide">{ticketNum}</span>
                  </div>
                  <div className="flex gap-2">
                    {ticket.status !== 'COMPLETED' && (
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${priorityBg} ${priorityText}`}>
                        {ticket.priority === 'EMERGENCY' ? 'Urgent' : ticket.priority}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusBg}`}>
                      {ticket.status === 'COMPLETED' ? 'Closed' : 'Open'}
                    </span>
                  </div>
                </div>
                
                {/* Content Row */}
                <div className="pl-2 mt-1">
                  <h3 className="font-medium text-sm text-zinc-100">{ticket.category.name} - {ticket.description.substring(0, 40)}{ticket.description.length > 40 ? '...' : ''}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1.5">{ticket.location.name}</p>
                </div>
                
                {/* Bottom Row: Time and Avatars */}
                <div className="flex justify-between items-end pl-2 mt-1">
                  <p className="text-[11px] text-zinc-500 font-medium">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
                  
                  {/* Avatar Stack */}
                  <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full bg-zinc-800 border-2 border-[#121214] flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase">
                      {ticket.reporter_name.substring(0,2)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {tickets.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No tickets found.
          </div>
        )}
      </div>
    </PageTransition>
  )
}
