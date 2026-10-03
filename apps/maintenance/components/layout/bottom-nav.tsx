'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, LogOut, ArrowRightLeft, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'

const bottomNavItems = [
  { title: 'Tickets', href: '/tickets', icon: Ticket },
]

export function BottomNav({ role }: { role: 'ADMIN' | 'BRANCH' }) {
  const pathname = usePathname()
  const items = role === 'ADMIN' ? [...bottomNavItems, { title: 'Branches', href: '/admin/branches', icon: Users }] : bottomNavItems

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur-md border-t border-border z-50 px-2 flex items-center justify-around">
      {items.map((item, index) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-18 h-full transition-colors",
              isActive ? "text-red-600" : "text-slate-700 hover:text-red-600"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive ? "fill-red-500/10" : "")} />
            <span className="text-[10px] font-bold tracking-wider uppercase">{item.title}</span>
          </Link>
        )
      })}

      
      <div className="h-8 w-[1px] bg-slate-300 rounded-full mx-1" />

      <button
        onClick={() => {
          import('react').then(react => {
            react.startTransition(() => {
              logout()
            })
          })
        }}
        className="flex flex-col items-center justify-center gap-1 w-18 h-full transition-colors text-slate-700 hover:text-red-600"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px] font-bold tracking-wider uppercase">Logout</span>
      </button>
    </div>
  )
}
