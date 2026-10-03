'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTotalCost } from '@/app/actions/maintenance'

export function TotalCostForm({ ticketId, initialAmount, disabled = false }: { ticketId: string; initialAmount: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(initialAmount)
  const [error, setError] = useState('')
  const router = useRouter()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const normalizedAmount = amount.replaceAll(',', '').replace(/^₹\s*/, '').trim()
    startTransition(async () => {
      try {
        const result = await setTotalCost(ticketId, normalizedAmount)
        if (!result.success) setError(result.error)
        else router.refresh()
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to save the cost.')
      }
    })
  }

  const formatAmount = () => {
    const raw = amount.replaceAll(',', '').replace(/^₹\s*/, '').trim()
    if (!raw || isNaN(Number(raw))) return
    setAmount(`₹ ${Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <input
          required
          min={0}
          step="0.01"
          type="text"
          disabled={disabled || isPending}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={formatAmount}
          placeholder="₹ amount"
          className="h-10 w-full min-w-0 border border-slate-300 px-3 text-sm font-semibold tabular-nums outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-500"
        />
        <button
          type="submit"
          disabled={disabled || isPending}
          className="h-10 shrink-0 bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </form>
  )
}
