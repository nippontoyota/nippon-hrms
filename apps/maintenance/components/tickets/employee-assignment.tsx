'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { searchEmployees, assignEmployeeToTicket, notifyAssigneeViaWhatsApp } from '@/app/actions/maintenance'

type Employee = { id: string; name: string; mobile_number: string }

export function EmployeeAssignment({ 
  ticketId, 
  currentAssignee, 
  disabled = false 
}: { 
  ticketId: string; 
  currentAssignee?: { id: string; name: string } | null;
  disabled?: boolean 
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Employee[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await searchEmployees(query)
      setResults(res)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleAssign = (employee: Employee) => {
    setError('')
    startTransition(async () => {
      const result = await assignEmployeeToTicket(ticketId, employee.id, employee.name)
      if (!result.success) {
        setError(result.error)
      } else {
        setQuery('')
        setResults([])
        router.refresh()
      }
    })
  }

  const handleNotify = () => {
    if (!currentAssignee) return
    setError('')
    setNotificationStatus('Sending...')
    startTransition(async () => {
      const result = await notifyAssigneeViaWhatsApp(ticketId, currentAssignee.id)
      if (!result.success) {
        setError(result.error)
        setNotificationStatus('')
      } else {
        setNotificationStatus('Sent!')
        setTimeout(() => setNotificationStatus(''), 3000)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {currentAssignee ? (
        <div className="flex flex-col gap-4 border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Assigned to</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{currentAssignee.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNotify}
              disabled={disabled || isPending || notificationStatus === 'Sent!'}
              className="inline-flex h-9 items-center justify-center bg-[#25D366] px-4 text-xs font-bold text-white transition hover:bg-[#20bd5a] disabled:opacity-50"
            >
              <MessageCircle className="mr-2 h-3.5 w-3.5" />
              {notificationStatus || 'Send WhatsApp'}
            </button>
            <button
              onClick={() => handleAssign({ id: '', name: '', mobile_number: '' })}
              disabled={disabled || isPending}
              className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline disabled:opacity-50"
            >
              Unassign
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled || isPending}
            placeholder="Search employee by name..."
            className="h-10 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-slate-100"
          />
          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {results.map((emp) => (
                <li
                  key={emp.id}
                  onClick={() => handleAssign(emp)}
                  className="cursor-pointer border-b border-slate-100 px-4 py-2 hover:bg-slate-50 last:border-0"
                >
                  <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.mobile_number}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
