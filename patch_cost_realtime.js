const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/total-cost-form.tsx';

let code = `
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setTotalCost } from '@/app/actions/maintenance'
import { Check } from 'lucide-react'

export function TotalCostForm({ ticketId, initialAmount, disabled = false }: { ticketId: string; initialAmount: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  
  const formatValue = (val: string) => {
    const raw = val.replaceAll(',', '').replace(/^₹\\s*/, '').trim()
    if (!raw || isNaN(Number(raw)) || Number(raw) === 0) return ''
    return Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const [amount, setAmount] = useState(() => formatValue(initialAmount))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()
  const previousSaved = useRef(amount)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
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

    if (raw === previousSaved.current.replaceAll(',', '').trim()) {
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = event.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('')
    
    if (parts[0]) {
      parts[0] = Number(parts[0]).toLocaleString('en-IN')
    }
    
    setAmount(parts.join('.'))
  }

  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center justify-between">
        <label className="text-lg font-bold text-slate-950">Total Cost</label>
        {saved && <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Check className="h-3 w-3" /> Saved</span>}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={\`text-3xl font-light transition-colors \${error ? 'text-red-500' : 'text-emerald-600'}\`}>₹</span>
        <input
          inputMode="decimal"
          type="text"
          disabled={disabled || isPending}
          value={amount}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0.00"
          className={\`w-full bg-transparent py-1 text-4xl font-light tracking-tighter tabular-nums outline-none transition \${error ? 'text-red-600' : 'text-emerald-600 disabled:opacity-50'}\`}
        />
      </div>
      <div className={\`h-0.5 w-full transition-colors \${error ? 'bg-red-500' : isFocused ? 'bg-emerald-500' : 'bg-slate-200'}\`} />
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
`

fs.writeFileSync(file, code);
