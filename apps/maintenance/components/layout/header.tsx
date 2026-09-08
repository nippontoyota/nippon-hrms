'use client'

export function Header({ role, branchName }: { role: 'ADMIN' | 'BRANCH'; branchName?: string | null }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 backdrop-blur-xl px-5 sticky top-0 z-40">
      <div className="flex items-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:hidden">Nippon Toyota</h1>
        <h1 className="text-xl font-bold tracking-tight text-foreground hidden md:block">{role === 'ADMIN' ? 'Maintenance operations' : branchName || 'Branch maintenance'}</h1>
      </div>
    </header>
  )
}
