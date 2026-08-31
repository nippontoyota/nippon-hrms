'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ReporterType, TicketPriority } from '@prisma/client'

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
