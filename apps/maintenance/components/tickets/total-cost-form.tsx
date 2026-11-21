
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setTotalCost } from '@/app/actions/maintenance'
import { Check, Save } from 'lucide-react'
import { toast } from 'sonner'

export function TotalCostForm({ ticketId, initialAmount, disabled = false }: { ticketId: string; initialAmount: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  
  const formatValue = (val: string) => {
    const raw = val.replaceAll(',', '').replace(/^₹\s*/, '').trim()
    if (!raw || isNaN(Number(raw)) || Number(raw) === 0) return ''
    return Number(raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }

  const [amount, setAmount] = useState(() => formatValue(initialAmount))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()
  const previousSaved = useRef(amount)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const raw = amount.replaceAll(',', '').trim()
    if (!raw || isNaN(Number(raw))) {
      setAmount(previousSaved.current)
      return
    }
    const formatted = formatValue(raw) || previousSaved.current
    setAmount(formatted)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = event.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('')
    
    if (parts[0]) {
      parts[0] = Number(parts[0]).toLocaleString('en-IN')
    }
    
    setAmount(parts.join('.'))
    if (error) setError('')
  }

  const handleSave = () => {
    if (disabled || isPending) return

    const raw = amount.replaceAll(',', '').trim()
    if (raw && isNaN(Number(raw))) {
      setError('Please enter a valid numeric amount.')
      toast.error('Please enter a valid numeric amount.')
      return
    }

    const numericAmount = raw === '' ? 0 : Number(raw)
    const formatted = numericAmount > 0 ? formatValue(raw) : ''
    setAmount(formatted)

    setError('')
    startTransition(async () => {
      try {
        const result = await setTotalCost(ticketId, raw)
        if (!result.success) {
          setError(result.error)
          toast.error(result.error || 'Unable to save the cost.')
          setAmount(previousSaved.current)
        } else {
          previousSaved.current = formatted
          setSaved(true)
          toast.success('Cost updated successfully')
          router.refresh()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to save the cost.'
        setError(msg)
        toast.error(msg)
        setAmount(previousSaved.current)
      }
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Total Cost</h2>
          <p className="mt-1 text-sm text-slate-700">Track total materials &amp; labour expenses.</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className={`text-3xl font-light transition-colors ${error ? 'text-red-500' : 'text-emerald-600'}`}>
          ₹
        </span>
        <input
          id="total-cost-input"
          aria-label="Total Cost Amount"
          inputMode="decimal"
          type="text"
          disabled={disabled || isPending}
          value={amount}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="0"
          className={`w-full bg-transparent py-1 text-4xl font-light tracking-tighter tabular-nums outline-none transition ${
            error ? 'text-red-600' : 'text-emerald-600 disabled:opacity-50'
          }`}
        />
      </div>

      <div className={`mt-1 h-0.5 w-full transition-colors ${error ? 'bg-red-500' : isFocused ? 'bg-emerald-500' : 'bg-slate-200'}`} />

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      {!disabled && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Press Enter or click Save
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 bg-emerald-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </section>
  )
}
