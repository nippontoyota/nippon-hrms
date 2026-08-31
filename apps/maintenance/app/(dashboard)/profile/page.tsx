import prisma from '@/lib/prisma'
import { PageTransition } from '@/components/ui/page-transition'
import { Bell, LogOut, PackageOpen, AlertTriangle, ShieldCheck, ChevronRight, Settings, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  // Fetch real inventory stats for the manager
  const [totalItems, lowStockItems] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({
      where: { current_stock: { lte: prisma.inventoryItem.fields.minimum_stock } }
    })
  ])

  return (
    <PageTransition className="pb-24 px-4 pt-6 max-w-2xl mx-auto space-y-6">
      {/* Minimal Header */}
      <div className="flex items-center gap-4 pb-2">
        <div className="h-16 w-16 rounded-md border border-zinc-800 bg-[#121214] flex items-center justify-center">
          <span className="text-xl font-bold text-zinc-300">AD</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Admin User</h1>
          <p className="text-red-500 font-medium text-sm mt-0.5">Inventory Manager</p>
          <p className="text-zinc-500 text-xs mt-0.5">admin@nippontoyota.com</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#121214] border border-zinc-800 shadow-sm rounded-md hover:bg-[#161618] transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Total Items</span>
              <PackageOpen className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-white">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#121214] border border-zinc-800 shadow-sm rounded-md hover:bg-[#161618] transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-500">Low Stock</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <div className="bg-[#121214] border border-zinc-800 rounded-md divide-y divide-zinc-800/50">
        <button className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-sm text-zinc-200">Account Preferences</span>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </button>
        <button className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-sm text-zinc-200">Notifications</span>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </button>
        <button className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-sm text-zinc-200">Help & Support</span>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </button>
      </div>

      {/* Log Out */}
      <form action={async () => {
        'use server'
        import('next/headers').then(async ({ cookies }) => {
          const cookieStore = await cookies()
          cookieStore.delete('dev_session')
          import('next/navigation').then(({ redirect }) => redirect('/login'))
        })
      }}>
        <button type="submit" className="w-full bg-[#121214] border border-red-500/20 p-4 rounded-md flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors">
          <LogOut className="h-4 w-4 text-red-500" />
          <span className="font-semibold text-sm text-red-500">Log Out</span>
        </button>
      </form>
    </PageTransition>
  )
}
