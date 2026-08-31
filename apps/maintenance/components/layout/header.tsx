'use client'

import { Bell, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 backdrop-blur-xl px-5 sticky top-0 z-40">
      <div className="flex items-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:hidden">Nippon Toyota</h1>
        <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">Maintenance & Inventory</h1>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-[#1C1C1E]">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center gap-3 pl-3 md:pl-4 border-l border-[#1C1C1E]">
          <UserCircle className="h-8 w-8 text-zinc-500" />
          <div className="text-sm">
            <p className="font-semibold text-white leading-none">Demo User</p>
            <p className="text-xs text-zinc-400 mt-1">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
