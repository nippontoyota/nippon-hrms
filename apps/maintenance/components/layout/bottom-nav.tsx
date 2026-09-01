'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Ticket, Package, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { title: 'Tickets', href: '/tickets', icon: Ticket },
  { title: 'Inventory', href: '/inventory', icon: Package },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[84px] bg-background/95 backdrop-blur-md border-t border-border z-50 px-2 pb-[env(safe-area-inset-bottom,16px)] flex items-center justify-around">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors",
              isActive ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-6 w-6", isActive ? "fill-red-500/10" : "")} />
            <span className="text-[10px] font-medium tracking-wide">{item.title}</span>
          </Link>
        )
      })}
    </div>
  )
}
