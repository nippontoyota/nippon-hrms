'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  Package, 
  ArrowLeftRight, 
  AlertTriangle,
  Users,
  MapPin,
  Tag
} from 'lucide-react'

// Note: In a real app, these items would be filtered by user role
const navItems = [
  {
    title: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    section: 'Maintenance'
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    section: 'Inventory'
  }
]

export function Sidebar() {
  const pathname = usePathname()

  const sections = Array.from(new Set(navItems.map(item => item.section)))

  return (
    <div className="flex h-full w-64 flex-col bg-[#111] text-slate-50 border-r border-[#222]">
      <div className="flex h-14 items-center gap-2 px-6 font-bold text-lg border-b border-[#222]">
        <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center">
          <span className="text-white text-xs font-black">T</span>
        </div>
        <span className="tracking-tight">Nippon Toyota</span>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-8 px-3">
          {sections.map(section => (
            <div key={section}>
              <h4 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                {section}
              </h4>
              <div className="space-y-1">
                {navItems
                  .filter(item => item.section === section)
                  .map(item => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                          isActive 
                            ? 'bg-red-600 text-white shadow-md shadow-red-900/20' 
                            : 'text-slate-400 hover:bg-[#222] hover:text-white'
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                        {item.title}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
