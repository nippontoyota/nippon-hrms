import { Sidebar } from '@/components/layout/sidebar'
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
    <div className="flex min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar role={session.role} branchName={session.branchName} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden pb-[84px] md:pb-0">
        <Header role={session.role} branchName={session.branchName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <BottomNav role={session.role} />
    </div>
  )
}
