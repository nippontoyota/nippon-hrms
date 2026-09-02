'use client'

export default function TicketsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto mt-20 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-8 text-red-900">
      <h2 className="mb-2 text-xl font-bold">Unable to load tickets</h2>
      <p className="mb-5 text-sm">The ticket list could not be loaded. Try again.</p>
      <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-bold text-white active:scale-[.98]">Try again</button>
    </div>
  )
}
