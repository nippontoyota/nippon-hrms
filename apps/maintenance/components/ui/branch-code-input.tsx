'use client'

import { useState, useRef } from 'react'

export function BranchCodeInput() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()
    if (val.length <= 5) {
      setValue(val)
    }
  }

  return (
    <div className="relative mt-2">
      <input
        type="hidden"
        name="identifier"
        value={value}
      />
      <div 
        className="flex overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-sm focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/20 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const isActive = value.length === i || (i === 4 && value.length === 5)
          const char = value[i] || ''
          return (
            <div 
              key={i} 
              className={`relative flex h-14 flex-1 items-center justify-center border-r border-slate-200 last:border-r-0 text-xl font-bold uppercase tracking-widest transition-colors ${isActive ? 'bg-red-50 text-red-600' : 'text-slate-900'}`}
            >
              {char}
              {isActive && !char && (
                <div className="absolute bottom-3 left-1/2 h-[2px] w-4 -translate-x-1/2 animate-pulse bg-red-400 rounded-full" />
              )}
            </div>
          )
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        autoFocus
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  )
}
