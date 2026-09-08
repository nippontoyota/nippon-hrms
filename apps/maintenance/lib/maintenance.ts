import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export const maintenanceTicketInclude = {
  location: true,
  category: true,
  branch: { select: { name: true } },
  assignee: true,
  assignments: { include: { assignee: true }, orderBy: { assigned_at: 'desc' as const } },
  costs: { orderBy: { created_at: 'desc' as const } },
  activities: { orderBy: { created_at: 'desc' as const } },
  status_history: { orderBy: { created_at: 'desc' as const } },
} satisfies Prisma.TicketInclude

export async function getMaintenanceTicket(ticketId: string) {
  return prisma.ticket.findUnique({ where: { id: ticketId }, include: maintenanceTicketInclude })
}

export async function listMaintenanceAssignees() {
  return prisma.maintenanceAssignee.findMany({
    where: { is_active: true },
    orderBy: { normalized_name: 'asc' },
  })
}
