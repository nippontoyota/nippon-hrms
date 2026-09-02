'use client'

import { useFormStatus } from 'react-dom'
import { updateTicketStatus } from '@/app/actions/tickets'

const nextStatus: Record<string, { value: string; label: string } | null> = {
  NEW: { value: 'IN_PROGRESS', label: 'Start work' },
  UNDER_REVIEW: { value: 'IN_PROGRESS', label: 'Start work' },
  PENDING_INFORMATION: { value: 'UNDER_REVIEW', label: 'Review' },
  IN_PROGRESS: { value: 'COMPLETED', label: 'Resolve' },
  COMPLETED: { value: 'CLOSED', label: 'Close' },
  CLOSED: null,
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition-transform active:scale-[.98] disabled:cursor-wait disabled:opacity-60">{pending ? 'Saving...' : label}</button>
}

export function TicketStatusControl({ ticketId, status }: { ticketId: string; status: string }) {
  const action = nextStatus[status]
  if (!action) return null

  return (
    <form action={updateTicketStatus}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="status" value={action.value} />
      <SubmitButton label={action.label} />
    </form>
  )
}
