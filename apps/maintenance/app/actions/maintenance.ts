'use server'

import { CostType, Prisma, TicketStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { listMaintenanceAssignees } from '@/lib/maintenance'
import { requireMaintenanceActor } from '@/lib/maintenance-auth'

const ticketId = z.string().trim().min(1, 'Ticket is required.')
const assigneeId = z.string().trim().min(1, 'Assignee is required.')
const assigneeName = z.string().trim().min(1, 'Assignee name is required.').max(120)
const costDescription = z.string().trim().min(1, 'Description is required.').max(500)
const costAmount = z.number().finite().positive('Amount must be greater than zero.').max(99999999.99)

const assignmentInput = z.object({ ticketId, assigneeId: assigneeId.nullable() })
const assigneeInput = z.object({ name: assigneeName })
const costInput = z.object({
  ticketId,
  type: z.nativeEnum(CostType),
  description: costDescription,
  amount: z.preprocess((value) => typeof value === 'string' ? Number(value) : value, costAmount),
})
const closeInput = z.object({ ticketId })

function revalidateTicket(ticketId: string) {
  revalidatePath('/tickets')
  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/dashboard')
}

export async function getAssignees() {
  await requireMaintenanceActor()
  return listMaintenanceAssignees()
}

export async function addAssignee(input: unknown) {
  const actor = await requireMaintenanceActor()
  const { name } = assigneeInput.parse(input)
  const normalizedName = name.toLocaleLowerCase()

  try {
    const assignee = await prisma.maintenanceAssignee.create({
      data: { name, normalized_name: normalizedName },
    })
    return { success: true as const, assignee }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false as const, error: 'An assignee with this name already exists.' }
    }
    console.error('Failed to create maintenance assignee', { actor, error })
    return { success: false as const, error: 'Unable to save the assignee.' }
  }
}

export async function assignTicket(input: unknown) {
  const actor = await requireMaintenanceActor()
  const parsed = assignmentInput.parse(input)

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: parsed.ticketId }, select: { assignee_id: true, status: true } })
      if (!ticket) throw new Error('Ticket not found')
      if (ticket.status === TicketStatus.CLOSED) throw new Error('Closed tickets cannot be reassigned')

      if (parsed.assigneeId) {
        const assignee = await tx.maintenanceAssignee.findFirst({ where: { id: parsed.assigneeId, is_active: true } })
        if (!assignee) throw new Error('Assignee not found')
        if (ticket.assignee_id === assignee.id) return
        if (ticket.assignee_id) {
          await tx.ticketAssignment.updateMany({ where: { ticket_id: parsed.ticketId, assignee_id: ticket.assignee_id, cleared_at: null }, data: { cleared_at: new Date() } })
        }
        await tx.ticket.update({ where: { id: parsed.ticketId }, data: { assignee_id: assignee.id } })
        await tx.ticketAssignment.create({ data: { ticket_id: parsed.ticketId, assignee_id: assignee.id, assigned_by: actor } })
        await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor, type: 'ASSIGNED', detail: `Assigned to ${assignee.name}` } })
      } else {
        if (!ticket.assignee_id) return
        const current = await tx.maintenanceAssignee.findUnique({ where: { id: ticket.assignee_id }, select: { name: true } })
        await tx.ticket.update({ where: { id: parsed.ticketId }, data: { assignee_id: null } })
        await tx.ticketAssignment.updateMany({ where: { ticket_id: parsed.ticketId, assignee_id: ticket.assignee_id, cleared_at: null }, data: { cleared_at: new Date() } })
        await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor, type: 'UNASSIGNED', detail: `Unassigned${current ? ` from ${current.name}` : ''}` } })
      }
    })
    revalidateTicket(parsed.ticketId)
    return { success: true as const }
  } catch (error) {
    console.error('Failed to assign maintenance ticket', { actor, error })
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to update assignment.' }
  }
}

export async function addTicketCost(input: unknown) {
  const actor = await requireMaintenanceActor()
  const parsed = costInput.parse(input)

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: parsed.ticketId }, select: { status: true } })
      if (!ticket) throw new Error('Ticket not found')
      if (ticket.status === TicketStatus.CLOSED) throw new Error('Closed tickets cannot receive new costs')
      const cost = await tx.ticketCost.create({ data: { ticket_id: parsed.ticketId, type: parsed.type, description: parsed.description, amount: parsed.amount, created_by: actor } })
      await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor, type: 'COST_ADDED', detail: `Added ${parsed.type.toLowerCase()} cost of ₹${Number(cost.amount).toFixed(2)}: ${parsed.description}` } })
    })
    revalidateTicket(parsed.ticketId)
    return { success: true as const }
  } catch (error) {
    console.error('Failed to add maintenance ticket cost', { actor, error })
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to save the cost.' }
  }
}

export async function closeTicket(input: unknown) {
  const actor = await requireMaintenanceActor()
  const parsed = closeInput.parse(input)

  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.ticket.updateMany({ where: { id: parsed.ticketId, status: { not: TicketStatus.CLOSED } }, data: { status: TicketStatus.CLOSED } })
      if (changed.count === 0) {
        const ticket = await tx.ticket.findUnique({ where: { id: parsed.ticketId }, select: { id: true, status: true } })
        if (!ticket) throw new Error('Ticket not found')
        throw new Error(ticket.status === TicketStatus.CLOSED ? 'Ticket is already closed' : 'Ticket could not be closed')
      }
      await tx.ticketStatusHistory.create({ data: { ticket_id: parsed.ticketId, status: TicketStatus.CLOSED, notes: 'Ticket closed from maintenance portal' } })
      await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor, type: 'CLOSED', detail: 'Ticket closed' } })
    })
    revalidateTicket(parsed.ticketId)
    return { success: true as const }
  } catch (error) {
    console.error('Failed to close maintenance ticket', { actor, error })
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to close the ticket.' }
  }
}
