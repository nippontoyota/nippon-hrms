'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Ticket, Users } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

export function Header({ role, branchName }: { role: 'ADMIN' | 'BRANCH'; branchName?: string | null }) {
  const pathname = usePathname()

  const navItems = [
    { title: 'Tickets', href: '/tickets', icon: Ticket, roles: ['ADMIN', 'BRANCH'] },
    { title: 'Branches', href: '/admin/branches', icon: Users, roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(role))

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5 sticky top-0 z-40 sm:px-8">
      <div className="flex items-center gap-8">
        <Link href="/tickets" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500">
          <Image src="/nippon-logo.png" alt="Nippon Toyota" width={94} height={32} priority className="h-8 w-auto object-contain" />
        </Link>
        
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {pathname.startsWith('/tickets/') && pathname.length > 9 && (
           <Link href="/tickets" className="md:hidden flex h-8 items-center justify-center rounded-none bg-red-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-red-700">
             Back to queue
           </Link>
        )}
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{role === 'ADMIN' ? 'Administrator' : 'Branch Account'}</p>
          <p className="text-sm font-bold text-slate-900">{role === 'ADMIN' ? 'Maintenance Ops' : branchName}</p>
        </div>
        
        <button
          onClick={() => {
            import('react').then(react => {
              react.startTransition(() => {
                logout()
              })
            })
          }}
          className="hidden md:flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </header>
  )
}
