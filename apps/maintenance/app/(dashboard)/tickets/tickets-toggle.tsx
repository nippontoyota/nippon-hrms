'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function TicketsToggle({ currentStatus }: { currentStatus: string }) {
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-xl mb-4 relative z-0 border border-slate-200 shadow-inner">
      <Link href="?status=pending" scroll={false} className="flex-1 relative outline-none">
        {currentStatus === 'pending' && (
          <motion.div
            layoutId="ticket-toggle-bg"
            className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <div className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors duration-200 ${currentStatus === 'pending' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {currentStatus === 'pending' && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>}
          Pending
        </div>
      </Link>
      
      <Link href="?status=resolved" scroll={false} className="flex-1 relative outline-none">
        {currentStatus === 'resolved' && (
          <motion.div
            layoutId="ticket-toggle-bg"
            className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <div className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors duration-200 ${currentStatus === 'resolved' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {currentStatus === 'resolved' && <span className="h-2 w-2 rounded-full bg-emerald-500"></span>}
          Resolved
        </div>
      </Link>
    </div>
  )
}
