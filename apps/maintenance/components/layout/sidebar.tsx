'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Ticket, LogOut, ArrowRightLeft, Users } from 'lucide-react'
import Image from 'next/image'
import { logout } from '@/app/actions/auth'

const navItems = [
  {
    title: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    section: 'Maintenance'
  },
  { title: 'Branch accounts', href: '/admin/branches', icon: Users, section: 'Administration', roles: ['ADMIN'] },
]

export function Sidebar({ role, branchName }: { role: 'ADMIN' | 'BRANCH'; branchName?: string | null }) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role))
  const sections = Array.from(new Set(visibleItems.map(item => item.section)))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-dvh w-60 flex-col border-r border-border bg-background text-foreground">
      <div className="flex h-20 items-center px-6 border-b border-border">
        <Link href="/tickets" aria-label="Go to maintenance tickets" className="rounded-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <Image src="/maintenance-logo.png" alt="Nippon Toyota" width={112} height={38} priority className="h-10 w-auto object-contain" />
        </Link>
      </div>
      <div className="border-b border-border px-6 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">{role === 'ADMIN' ? 'Administrator' : 'Branch account'}</p>{role === 'BRANCH' && branchName && <p className="mt-1 truncate text-base font-bold text-foreground">{branchName}</p>}</div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-8 px-3">
          {sections.map(section => (
            <div key={section}>
              <h4 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-700">
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
                          'flex items-center gap-3 rounded-md px-3 py-3 text-base font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                            : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-600")} />
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
          className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-base font-semibold text-slate-700 transition-all duration-200 hover:bg-[#fff1f2] hover:text-[#b60718]"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  )
}
