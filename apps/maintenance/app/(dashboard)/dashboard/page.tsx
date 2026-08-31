import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, PlusCircle, Package, ArrowLeftRight, Users, QrCode, ClipboardList, TrendingUp } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Fetch real counts from DB
  const [ticketCount, inventoryCount, userCount, lowStockItems, recentTickets] = await Promise.all([
    prisma.ticket.count(),
    prisma.inventoryItem.count(),
    prisma.user.count(),
    // Get real low stock items for alerts
    prisma.inventoryItem.findMany({
      where: { current_stock: { lte: prisma.inventoryItem.fields.minimum_stock } },
      take: 2,
    }),
    // Get real recent active tickets for alerts
    prisma.ticket.findMany({
      where: { status: { not: 'COMPLETED' } },
      orderBy: { created_at: 'desc' },
      take: 2,
    })
  ])

  const quickActions = [
    { title: 'Raise Ticket', href: '/raise-ticket', icon: PlusCircle, count: null, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'All Tickets', href: '/tickets', icon: Ticket, count: ticketCount, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Inventory', href: '/inventory', icon: Package, count: inventoryCount, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Transactions', href: '#', icon: ArrowLeftRight, count: null, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Analytics', href: '#', icon: TrendingUp, count: null, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Scan QR', href: '#', icon: QrCode, count: null, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Audit Logs', href: '#', icon: ClipboardList, count: null, color: 'text-zinc-100', bg: 'bg-zinc-800' },
    { title: 'Users', href: '#', icon: Users, count: userCount, color: 'text-zinc-100', bg: 'bg-zinc-800' },
  ]

  return (
    <PageTransition className="p-4 max-w-3xl mx-auto space-y-6">
      {/* Mobile-style Launchpad Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <Link href={action.href} key={i}>
            <Card className="bg-card border border-border shadow-sm hover:bg-zinc-900 transition-colors cursor-pointer group h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-4 h-full relative">
                {action.count !== null && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    {action.count}
                  </div>
                )}
                <div className={`p-4 rounded-full ${action.bg} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-8 w-8 ${action.color}`} strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-sm text-center text-zinc-100">{action.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h3 className="text-xl font-bold tracking-tight mt-10 mb-4 px-2">Live Alerts</h3>
      <div className="space-y-3">
        {lowStockItems.length === 0 && recentTickets.length === 0 && (
          <p className="text-sm text-zinc-500 px-2">No active alerts at this time.</p>
        )}
        
        {lowStockItems.map(item => (
          <Card key={item.id} className="bg-card border border-border shadow-sm hover:bg-zinc-900 transition-colors cursor-pointer">
            <Link href="/inventory">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Low Stock: {item.name}</p>
                    <p className="text-xs text-zinc-400">Only {item.current_stock} {item.unit} remaining (Min: {item.minimum_stock})</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}

        {recentTickets.map(ticket => (
          <Card key={ticket.id} className="bg-card border border-border shadow-sm hover:bg-zinc-900 transition-colors cursor-pointer">
            <Link href="/tickets">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${ticket.priority === 'EMERGENCY' ? 'bg-red-600 animate-pulse' : ticket.priority === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <p className="font-medium text-sm text-foreground">Ticket {ticket.ticket_number}</p>
                  </div>
                  <p className="text-xs text-zinc-400 pl-5">{ticket.reporter_name} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </PageTransition>
  )
}
