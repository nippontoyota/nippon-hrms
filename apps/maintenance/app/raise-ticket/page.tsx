import prisma from '@/lib/prisma'
import { TicketForm } from './ticket-form'

export const dynamic = 'force-dynamic'

export default async function RaiseTicketPage() {
  const locations = await prisma.location.findMany({
    where: { is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  const categories = await prisma.category.findMany({
    where: { is_active: true, type: 'TICKET' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <TicketForm locations={locations} categories={categories} />
    </div>
  )
}
