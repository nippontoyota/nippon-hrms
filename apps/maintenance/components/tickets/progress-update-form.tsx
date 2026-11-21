'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TicketStatus } from '@prisma/client'
import { updateTicketProgress } from '@/app/actions/maintenance'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const OPERATIONAL_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: TicketStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TicketStatus.UNDER_REVIEW, label: 'Under Review' },
  { value: TicketStatus.PENDING_INFORMATION, label: 'Pending Information' },
  { value: TicketStatus.COMPLETED, label: 'Completed' },
]

export function ProgressUpdateForm({
  ticketId,
  currentStatus,
  disabled = false,
}: {
  ticketId: string
  currentStatus: TicketStatus
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const availableStatuses = OPERATIONAL_STATUSES.some((s) => s.value === currentStatus)
    ? OPERATIONAL_STATUSES
    : [{ value: currentStatus, label: currentStatus.replaceAll('_', ' ') }, ...OPERATIONAL_STATUSES]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled || isPending) return

    const trimmedNotes = notes.trim()
    if (status === currentStatus && !trimmedNotes) {
      setError('Please select a different status or enter a progress remark.')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        const result = await updateTicketProgress({
          ticketId,
          status,
          notes: trimmedNotes || undefined,
        })

        if (!result.success) {
          setError(result.error)
          toast.error(result.error || 'Failed to update progress')
        } else {
          setNotes('')
          toast.success('Work progress updated successfully')
          router.refresh()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to update progress.'
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Work Progress & Status</h2>
          <p className="mt-1 text-sm text-slate-700">Update ticket status and log work progress.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="ticket-status-select" className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 mb-1.5">
            Ticket Status
          </label>
          <select
            id="ticket-status-select"
            disabled={disabled || isPending}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TicketStatus)
              setError('')
            }}
            className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
          >
            {availableStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticket-progress-notes" className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 mb-1.5">
            Progress Remarks
          </label>
          <textarea
            id="ticket-progress-notes"
            rows={3}
            disabled={disabled || isPending}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setError('')
            }}
            placeholder="e.g. Job is halfway done, compressor removed, waiting for parts..."
            className="w-full border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 placeholder:text-slate-400 resize-none"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || isPending}
          className="inline-flex h-9 w-full items-center justify-center gap-2 bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating...
            </>
          ) : (
            'Post Update'
          )}
        </button>
      </form>
    </section>
  )
}
