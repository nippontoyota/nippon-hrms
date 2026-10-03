'use server'

import { CostType, Prisma, TicketStatus } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { listMaintenanceAssignees } from '@/lib/maintenance'
import { requireMaintenanceActor, requireMaintenanceAdmin, requireMaintenanceSession } from '@/lib/maintenance-auth'
import { MAINTENANCE_BRANCHES, isCanonicalMaintenanceBranchName, normalizeMaintenanceBranchName } from '@/lib/maintenance-branches'
import { hashMaintenanceCode, loginKey, recoverMaintenanceCode } from '@/lib/password'

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
const transferInput = z.object({ ticketId, destinationBranchId: z.string().trim().min(1), reason: z.string().trim().min(5).max(500) })
const transferDecisionInput = z.object({ transferId: z.string().trim().min(1), reason: z.string().trim().max(500).optional() })
const branchAccountInput = z.object({ branchId: z.string().trim().min(1), code: z.string().trim().regex(/^[A-Za-z0-9]{5,12}$/).optional() })

function revalidateTicket(ticketId: string) {
  revalidatePath('/tickets')
  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/dashboard')
}

function inputError(error: unknown) {
  return error instanceof z.ZodError ? error.issues[0]?.message || 'Invalid input.' : 'Invalid input.'
}

export async function getAssignees() {
  await requireMaintenanceActor()
  return listMaintenanceAssignees()
}

export async function addAssignee(input: unknown) {
  const actor = (await requireMaintenanceAdmin()).accountId
  let name: string
  try {
    name = assigneeInput.parse(input).name
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
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
  const session = await requireMaintenanceSession()
  const actor = session.accountId
  let parsed: z.infer<typeof assignmentInput>
  try {
    parsed = assignmentInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id: parsed.ticketId, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) }, select: { assignee_id: true, status: true } })
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
  const session = await requireMaintenanceSession()
  const actor = session.accountId
  let parsed: z.infer<typeof costInput>
  try {
    parsed = costInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id: parsed.ticketId, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) }, select: { status: true } })
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
  const session = await requireMaintenanceSession()
  const actor = session.accountId
  let parsed: z.infer<typeof closeInput>
  try {
    parsed = closeInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.ticket.updateMany({ where: { id: parsed.ticketId, status: { not: TicketStatus.CLOSED }, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) }, data: { status: TicketStatus.CLOSED } })
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

export async function reopenTicket(input: unknown) {
  const actor = (await requireMaintenanceAdmin()).accountId
  let parsed: z.infer<typeof closeInput>
  try {
    parsed = closeInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.ticket.updateMany({ where: { id: parsed.ticketId, status: TicketStatus.CLOSED }, data: { status: TicketStatus.NEW } })
      if (changed.count === 0) {
        const ticket = await tx.ticket.findUnique({ where: { id: parsed.ticketId }, select: { id: true, status: true } })
        if (!ticket) throw new Error('Ticket not found')
        throw new Error('Ticket is not closed')
      }
      await tx.ticketStatusHistory.create({ data: { ticket_id: parsed.ticketId, status: TicketStatus.NEW, notes: 'Ticket reopened by admin' } })
      await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor, type: 'REOPENED', detail: 'Ticket reopened' } })
    })
    revalidateTicket(parsed.ticketId)
    return { success: true as const }
  } catch (error) {
    console.error('Failed to reopen maintenance ticket', { actor, error })
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to reopen the ticket.' }
  }
}

export async function listMaintenanceBranches() {
  await requireMaintenanceSession()
  const branches = await prisma.maintenanceBranch.findMany({ where: { is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
  return branches.filter((branch) => isCanonicalMaintenanceBranchName(branch.name)).map((branch) => ({ ...branch, name: normalizeMaintenanceBranchName(branch.name) }))
}

export async function listBranchAccounts() {
  await requireMaintenanceAdmin()
  const branches = await prisma.maintenanceBranch.findMany({ orderBy: { name: 'asc' }, include: { account: { select: { id: true, is_active: true, login_key: true, secret_hash: true } } } })
  return branches.filter((branch) => isCanonicalMaintenanceBranchName(branch.name)).map((branch) => {
    const name = normalizeMaintenanceBranchName(branch.name)
    const definition = MAINTENANCE_BRANCHES.find((item) => item.name === name)
    const legacyCode = definition && branch.account?.login_key === loginKey(definition.code) ? definition.code : null
    return { ...branch, name, account: branch.account ? { id: branch.account.id, is_active: branch.account.is_active, current_code: recoverMaintenanceCode(branch.account.secret_hash) || legacyCode } : null }
  })
}

function generatedBranchCode() { return `NT${randomBytes(3).toString('hex').toUpperCase()}` }

export async function createBranchAccount(input: unknown) {
  const session = await requireMaintenanceAdmin()
  let parsed: z.infer<typeof branchAccountInput>
  try {
    parsed = branchAccountInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
  const code = (parsed.code || generatedBranchCode()).trim().toUpperCase()
  try {
    const branch = await prisma.maintenanceBranch.findFirst({ where: { id: parsed.branchId, is_active: true }, select: { id: true, name: true } })
    if (!branch) throw new Error('Branch not found')
    const key = loginKey(code)
    const secretHash = await hashMaintenanceCode(code)
    const account = await prisma.maintenanceAccount.upsert({ where: { branch_id: branch.id }, update: { login_key: key, secret_hash: secretHash, role: 'BRANCH', is_active: true }, create: { branch_id: branch.id, login_key: key, secret_hash: secretHash, role: 'BRANCH', is_active: true } })
    revalidatePath('/admin/branches')
    return { success: true as const, code, branch: account.branch_id }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false as const, error: 'That branch code is already assigned. Choose a different code.' }
    console.error('Failed to create branch account', { actor: session.accountId, error }); return { success: false as const, error: 'Unable to create branch account.' }
  }
}

export async function rotateBranchCode(input: unknown) {
  const session = await requireMaintenanceAdmin()
  let parsed: z.infer<typeof branchAccountInput>
  try {
    parsed = branchAccountInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
  const code = (parsed.code || generatedBranchCode()).trim().toUpperCase()
  try {
    const account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: parsed.branchId, role: 'BRANCH' } })
    if (!account) throw new Error('Branch account not found')
    const secretHash = await hashMaintenanceCode(code)
    await prisma.maintenanceAccount.update({ where: { id: account.id }, data: { login_key: loginKey(code), secret_hash: secretHash } })
    revalidatePath('/admin/branches')
    return { success: true as const, code }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false as const, error: 'That branch code is already assigned. Choose a different code.' }
    console.error('Failed to rotate branch code', { actor: session.accountId, error }); return { success: false as const, error: 'Unable to rotate branch code.' }
  }
}

export async function requestTicketTransfer(input: unknown) {
  const session = await requireMaintenanceSession()
  let parsed: z.infer<typeof transferInput>
  try {
    parsed = transferInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id: parsed.ticketId, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}), status: { not: TicketStatus.CLOSED } }, select: { branch_id: true, ticket_number: true } })
      if (!ticket) throw new Error('Ticket not found')
      if (!ticket.branch_id) throw new Error('This ticket has no owning branch')
      if (parsed.destinationBranchId === ticket.branch_id) throw new Error('Choose another branch')
      const destination = await tx.maintenanceBranch.findFirst({ where: { id: parsed.destinationBranchId, is_active: true }, select: { name: true } })
      if (!destination) throw new Error('Destination branch not found')
      const pending = await tx.ticketTransfer.findFirst({ where: { ticket_id: parsed.ticketId, status: 'PENDING' } })
      if (pending) throw new Error('This ticket already has a pending transfer')
      await tx.ticketTransfer.create({ data: { ticket_id: parsed.ticketId, source_branch_id: ticket.branch_id, destination_branch_id: parsed.destinationBranchId, requested_by_id: session.accountId, reason: parsed.reason } })
      await tx.ticketActivity.create({ data: { ticket_id: parsed.ticketId, actor: session.accountId, type: 'ASSIGNED', detail: `Transfer requested to ${destination.name}: ${parsed.reason}` } })
    })
    revalidateTicket(parsed.ticketId)
    revalidatePath('/transfers')
    return { success: true as const }
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'Unable to request transfer.' } }
}

export async function acceptTicketTransfer(input: unknown) {
  const session = await requireMaintenanceSession()
  const branchId = session.branchId
  if (session.role !== 'BRANCH' || !branchId) return { success: false as const, error: 'Only the destination branch can accept a transfer.' }
  let parsed: z.infer<typeof transferDecisionInput>
  try {
    parsed = transferDecisionInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
  try {
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.ticketTransfer.findFirst({ where: { id: parsed.transferId, status: 'PENDING', destination_branch_id: branchId }, select: { ticket_id: true, destination_branch_id: true, source_branch_id: true } })
      if (!transfer) throw new Error('Transfer is no longer pending')
      await tx.ticketTransfer.update({ where: { id: parsed.transferId }, data: { status: 'ACCEPTED', response_reason: parsed.reason || null, responded_at: new Date() } })
      await tx.ticket.update({ where: { id: transfer.ticket_id }, data: { branch_id: transfer.destination_branch_id } })
      await tx.ticketActivity.create({ data: { ticket_id: transfer.ticket_id, actor: session.accountId, type: 'ASSIGNED', detail: 'Transfer accepted by destination branch' } })
    })
    revalidatePath('/tickets'); revalidatePath('/transfers')
    return { success: true as const }
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'Unable to accept transfer.' } }
}

export async function rejectTicketTransfer(input: unknown) {
  const session = await requireMaintenanceSession()
  const branchId = session.branchId
  if (session.role !== 'BRANCH' || !branchId) return { success: false as const, error: 'Only the destination branch can reject a transfer.' }
  let parsed: z.infer<typeof transferDecisionInput>
  try {
    parsed = transferDecisionInput.parse(input)
  } catch (error) {
    return { success: false as const, error: inputError(error) }
  }
  try {
    let ticketIdForRevalidation = ''
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.ticketTransfer.findFirst({ where: { id: parsed.transferId, status: 'PENDING', destination_branch_id: branchId }, select: { ticket_id: true } })
      if (!transfer) throw new Error('Transfer is no longer pending.')
      ticketIdForRevalidation = transfer.ticket_id
      await tx.ticketTransfer.update({ where: { id: parsed.transferId }, data: { status: 'REJECTED', response_reason: parsed.reason || 'Rejected by destination branch', responded_at: new Date() } })
      await tx.ticketActivity.create({ data: { ticket_id: transfer.ticket_id, actor: session.accountId, type: 'ASSIGNED', detail: `Transfer rejected by destination branch${parsed.reason ? `: ${parsed.reason}` : ''}` } })
    })
    revalidateTicket(ticketIdForRevalidation)
    revalidatePath('/tickets'); revalidatePath('/transfers')
    return { success: true as const }
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'Unable to reject transfer.' } }
}

export async function setTotalCost(ticketId: string, amountStr: string) {
  const session = await requireMaintenanceSession()
  const actor = session.accountId
  const amount = Number(amountStr)
  if (isNaN(amount) || amount < 0) return { success: false as const, error: 'Invalid amount' }

  try {
    await prisma.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.findFirst({ where: { id: ticketId, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) }, select: { status: true } })
      if (!ticket) throw new Error('Ticket not found')
      if (ticket.status === 'CLOSED') throw new Error('Closed tickets cannot be edited')

      await tx.ticketCost.deleteMany({ where: { ticket_id: ticketId } })

      if (amount > 0) {
        await tx.ticketCost.create({ data: { ticket_id: ticketId, type: 'MATERIAL', description: 'Total Cost', amount, created_by: actor } })
        await tx.ticketActivity.create({ data: { ticket_id: ticketId, actor, type: 'COST_ADDED', detail: `Set total cost to ₹${amount.toFixed(2)}` } })
      }
    })
    revalidateTicket(ticketId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to update total cost.' }
  }
}

export async function searchEmployees(query: string) {
  await requireMaintenanceSession()
  if (!query || query.length < 2) return []

  try {
    const results = await prisma.$queryRaw<{ id: string; name: string; mobile_number: string }[]>`
      SELECT id, name, mobile_number
      FROM employees
      WHERE name ILIKE ${'%' + query + '%'} OR mobile_number ILIKE ${'%' + query + '%'}
      LIMIT 10
    `
    return results
  } catch (error) {
    console.error('Failed to search employees:', error)
    return []
  }
}

export async function assignEmployeeToTicket(ticketId: string, employeeId?: string, employeeName?: string) {
  const session = await requireMaintenanceSession()
  const actor = session.accountId

  try {
    await prisma.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, ...(session.role === 'BRANCH' ? { branch_id: session.branchId } : {}) },
        select: { assignee_id: true, status: true }
      })
      if (!ticket) throw new Error('Ticket not found')
      if (ticket.status === 'CLOSED') throw new Error('Closed tickets cannot be reassigned')

      if (!employeeId || !employeeName) {
        if (!ticket.assignee_id) return
        await tx.ticket.update({ where: { id: ticketId }, data: { assignee_id: null } })
        await tx.ticketAssignment.updateMany({
          where: { ticket_id: ticketId, assignee_id: ticket.assignee_id, cleared_at: null },
          data: { cleared_at: new Date() }
        })
        await tx.ticketActivity.create({
          data: { ticket_id: ticketId, actor, type: 'UNASSIGNED', detail: 'Ticket unassigned' }
        })
        return
      }

      let assignee = await tx.maintenanceAssignee.findFirst({
        where: { normalized_name: employeeId }
      })

      if (!assignee) {
        assignee = await tx.maintenanceAssignee.create({
          data: { name: employeeName, normalized_name: employeeId, is_active: true }
        })
      }

      if (ticket.assignee_id === assignee.id) return

      if (ticket.assignee_id) {
        await tx.ticketAssignment.updateMany({
          where: { ticket_id: ticketId, assignee_id: ticket.assignee_id, cleared_at: null },
          data: { cleared_at: new Date() }
        })
      }

      await tx.ticket.update({
        where: { id: ticketId },
        data: { assignee_id: assignee.id }
      })
      
      await tx.ticketAssignment.create({
        data: { ticket_id: ticketId, assignee_id: assignee.id, assigned_by: actor }
      })
      
      await tx.ticketActivity.create({
        data: { ticket_id: ticketId, actor, type: 'ASSIGNED', detail: `Assigned to ${employeeName}` }
      })
    })

    revalidateTicket(ticketId)
    return { success: true as const }
  } catch (error) {
    console.error('Assign error:', error)
    return { success: false as const, error: error instanceof Error ? error.message : 'Unable to assign employee' }
  }
}

export async function notifyAssigneeViaWhatsApp(ticketId: string, assigneeId: string) {
  await requireMaintenanceSession()

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        branch: true,
        assignee: true
      }
    })

    if (!ticket || !ticket.assignee) {
      return { success: false as const, error: 'Ticket or Assignee not found' }
    }

    const employee = await prisma.$queryRaw<{ mobile_number: string }[]>`
      SELECT mobile_number FROM employees WHERE id = ${ticket.assignee.normalized_name} LIMIT 1
    `

    if (!employee || employee.length === 0) {
      return { success: false as const, error: 'Employee phone number not found in directory.' }
    }

    let phone = employee[0].mobile_number
    if (!phone.startsWith('+91') && !phone.startsWith('91') && phone.length === 10) {
      phone = '+91' + phone
    } else if (phone.startsWith('91')) {
      phone = '+' + phone
    }

    const messageText = `Hello ${ticket.assignee.name}, you have been assigned to Maintenance Ticket ${ticket.ticket_number} at ${ticket.branch?.name || 'Unknown Branch'}.
    
Description: ${ticket.description}`

    const response = await fetch('https://developer.doubletick.io/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DOUBLETICK_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            to: phone,
            content: {
              text: messageText
            }
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DoubleTick Error:', errorText)
      return { success: false as const, error: 'Failed to send WhatsApp message.' }
    }



    revalidateTicket(ticketId)
    return { success: true as const }

  } catch (error) {
    console.error('Notify Error:', error)
    return { success: false as const, error: 'Unable to send notification.' }
  }
}
