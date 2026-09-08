'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Ticket, LogOut, ArrowRightLeft, Users } from 'lucide-react'
import { logout } from '@/app/actions/auth'

const navItems = [
  {
    title: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    section: 'Maintenance'
  },
  { title: 'Transfers', href: '/transfers', icon: ArrowRightLeft, section: 'Maintenance', roles: ['ADMIN', 'BRANCH'] },
  { title: 'Branch accounts', href: '/admin/branches', icon: Users, section: 'Administration', roles: ['ADMIN'] },
]

export function Sidebar({ role, branchName }: { role: 'ADMIN' | 'BRANCH'; branchName?: string | null }) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role))
  const sections = Array.from(new Set(visibleItems.map(item => item.section)))

  return (
    <div className="flex h-full w-64 flex-col bg-background text-foreground border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/tickets" aria-label="Go to maintenance tickets" className="rounded-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-8 object-contain" />
        </Link>
      </div>
      <div className="border-b border-border px-6 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{role === 'ADMIN' ? 'Administrator' : 'Branch account'}</p>{role === 'BRANCH' && branchName && <p className="mt-1 truncate text-sm font-bold text-foreground">{branchName}</p>}</div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-8 px-3">
          {sections.map(section => (
            <div key={section}>
              <h4 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                {section}
              </h4>
              <div className="space-y-1">
                {visibleItems
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
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
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

      <div className="p-4 border-t border-border mt-auto">
        <button 
          onClick={() => {
            import('react').then(react => {
              react.startTransition(() => {
                logout()
              })
            })
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  )
}
