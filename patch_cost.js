const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the Total Cost section and just put the component at the end of the Issue details section
code = code.replace(
  '</div></section>\n      <section className="min-w-0 border border-slate-200 bg-slate-100 p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-end justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Total Cost</h2><p className="mt-1 text-sm text-slate-700">Record the final cost of this ticket.</p></div></div><div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === \'CLOSED\'} /></div></section>',
  '<div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === \'CLOSED\'} /></div></div></section>'
);

fs.writeFileSync(file, code);

// Now rewrite TotalCostForm
let file2 = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/total-cost-form.tsx';
let code2 = `
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setTotalCost } from '@/app/actions/maintenance'
import { Check } from 'lucide-react'

export function TotalCostForm({ ticketId, initialAmount, disabled = false }: { ticketId: string; initialAmount: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  
  const formatValue = (val: string) => {
    const raw = val.replaceAll(',', '').replace(/^₹\\s*/, '').trim()
    if (!raw || isNaN(Number(raw))) return ''
    return \`₹ \${Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`
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
    const raw = amount.replaceAll(',', '').replace(/^₹\\s*/, '').trim()
    if (!raw || isNaN(Number(raw))) {
      setAmount(previousSaved.current)
      return
    }
    
    const formatted = formatValue(raw) || previousSaved.current
    setAmount(formatted)

    if (raw === previousSaved.current.replaceAll(',', '').replace(/^₹\\s*/, '').trim()) {
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
    <div className="flex flex-col gap-2 border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Cost</p>
        {saved && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600"><Check className="h-3 w-3" /> Saved</span>}
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
        className={\`h-10 w-full min-w-0 border-b-2 bg-transparent text-lg font-bold tabular-nums outline-none transition \${error ? 'border-red-500 text-red-600' : 'border-slate-200 focus:border-red-500 disabled:opacity-50'}\`}
      />
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
`
fs.writeFileSync(file2, code2);
