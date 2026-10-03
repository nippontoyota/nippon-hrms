import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { requireMaintenanceSession } from '@/lib/maintenance-auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireMaintenanceSession()
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <Header role={session.role} branchName={session.branchName} />
      <main className="flex-1 overflow-y-auto bg-white">
        {children}
      </main>
      <BottomNav role={session.role} />
    </div>
  )
}
