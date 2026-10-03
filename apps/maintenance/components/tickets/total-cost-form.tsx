
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setTotalCost } from '@/app/actions/maintenance'
import { Check } from 'lucide-react'

export function TotalCostForm({ ticketId, initialAmount, disabled = false }: { ticketId: string; initialAmount: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  
  const formatValue = (val: string) => {
    const raw = val.replaceAll(',', '').replace(/^₹\s*/, '').trim()
    if (!raw || isNaN(Number(raw))) return ''
    return `₹ ${Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const [amount, setAmount] = useState(() => formatValue(initialAmount) || '₹ 0.00')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const previousSaved = useRef(amount)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleBlur = () => {
    const raw = amount.replaceAll(',', '').replace(/^₹\s*/, '').trim()
    if (!raw || isNaN(Number(raw))) {
      setAmount(previousSaved.current)
      return
    }
    
    const formatted = formatValue(raw) || previousSaved.current
    setAmount(formatted)

    if (raw === previousSaved.current.replaceAll(',', '').replace(/^₹\s*/, '').trim()) {
      return
    }

    setError('')
    startTransition(async () => {
      try {
        const result = await setTotalCost(ticketId, raw)
        if (!result.success) {
           setError(result.error)
           setAmount(previousSaved.current)
        } else {
           previousSaved.current = formatted
           setSaved(true)
           router.refresh()
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to save the cost.')
        setAmount(previousSaved.current)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Cost</label>
        {saved && <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full"><Check className="h-3 w-3" /> Saved</span>}
      </div>
      <input
        min={0}
        step="0.01"
        type="text"
        disabled={disabled || isPending}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        onBlur={handleBlur}
        placeholder="₹ 0.00"
        className={`w-full bg-transparent py-2 text-4xl font-light tracking-tighter tabular-nums outline-none transition ${error ? 'text-red-600' : 'text-slate-900 disabled:opacity-50'}`}
      />
      <div className={`h-0.5 w-full transition-colors ${error ? 'bg-red-500' : 'bg-slate-200'}`} />
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
