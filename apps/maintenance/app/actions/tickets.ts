'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ReporterType, TicketPriority, TicketStatus } from '@prisma/client'

const createTicketSchema = z.object({
  reporter_name: z.string().min(2, "Name must be at least 2 characters."),
  reporter_type: z.nativeEnum(ReporterType),
  location_id: z.string().min(1, "Location is required."),
  category_id: z.string().min(1, "Category is required."),
  priority: z.nativeEnum(TicketPriority),
  description: z.string().min(10, "Description must be at least 10 characters."),
})

export async function createTicket(formData: z.infer<typeof createTicketSchema>) {
  try {
    const validated = createTicketSchema.parse(formData)
    
    // Generate Ticket Number MT-YYYY-XXXX
    const currentYear = new Date().getFullYear()
    
    // Using an atomic transaction to ensure ticket numbers don't clash would be best,
    // but for simplicity in V1 we will just count and increment.
    const latestTicket = await prisma.ticket.findFirst({
      where: {
        ticket_number: {
          startsWith: `MT-${currentYear}-`
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    let sequence = 1
    if (latestTicket) {
      const parts = latestTicket.ticket_number.split('-')
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1
      }
    }

    const ticketNumber = `MT-${currentYear}-${sequence.toString().padStart(4, '0')}`

    const ticket = await prisma.ticket.create({
      data: {
        ticket_number: ticketNumber,
        status: 'NEW',
        priority: validated.priority,
        reporter_name: validated.reporter_name,
        reporter_type: validated.reporter_type,
        location_id: validated.location_id,
        category_id: validated.category_id,
        description: validated.description,
      }
    })

    await prisma.ticketStatusHistory.create({
      data: {
        ticket_id: ticket.id,
        status: 'NEW',
        notes: 'Ticket created by reporter'
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/tickets')
    
    return { success: true, ticketId: ticket.id, ticketNumber: ticket.ticket_number }
  } catch (error) {
    console.error("Failed to create ticket", error)
    return { success: false, error: "Failed to create ticket. Please try again." }
  }
}

const updateStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.nativeEnum(TicketStatus),
})

const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['UNDER_REVIEW', 'IN_PROGRESS', 'CLOSED'],
  UNDER_REVIEW: ['PENDING_INFORMATION', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'CLOSED'],
  PENDING_INFORMATION: ['UNDER_REVIEW', 'CLOSED'],
  MATERIALS_ADDED: ['PENDING_APPROVAL', 'IN_PROGRESS', 'CLOSED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CLOSED'],
  APPROVED: ['IN_PROGRESS', 'CLOSED'],
  REJECTED: ['UNDER_REVIEW', 'CLOSED'],
  IN_PROGRESS: ['COMPLETED', 'CLOSED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
}

export async function updateTicketStatus(formData: FormData): Promise<void> {
  try {
    const input = updateStatusSchema.parse({
      ticketId: formData.get('ticketId'),
      status: formData.get('status'),
    })
    await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id: input.ticketId }, select: { status: true } })
      if (!current || !allowedTransitions[current.status].includes(input.status)) {
        throw new Error('invalid status transition')
      }
      const changed = await tx.ticket.updateMany({
        where: { id: input.ticketId, status: current.status },
        data: { status: input.status },
      })
      if (changed.count !== 1) throw new Error('ticket changed concurrently')
      await tx.ticketStatusHistory.create({
        data: { ticket_id: input.ticketId, status: input.status, notes: `Status updated to ${input.status}` },
      })
    })
    revalidatePath(`/tickets/${input.ticketId}`)
    revalidatePath('/tickets')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Failed to update ticket status', error)
  }
}
