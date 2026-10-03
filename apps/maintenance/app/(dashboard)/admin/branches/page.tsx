import { requireMaintenanceAdmin } from '@/lib/maintenance-auth'
import { listBranchAccounts } from '@/app/actions/maintenance'
import { BranchManagement } from '@/components/admin/branch-management'

export const dynamic = 'force-dynamic'

export default async function BranchesPage() {
  await requireMaintenanceAdmin()
  const branches = await listBranchAccounts()
  return <div className="min-h-full bg-white p-5 sm:p-6"><div className="mx-auto max-w-5xl"><h1 className="text-xl font-bold text-slate-950">Branch accounts</h1><p className="mt-1 max-w-2xl text-xs text-slate-700">View the active login code for each branch, copy it when needed, or change it instantly. A changed code invalidates the previous one.</p><BranchManagement branches={branches} /></div></div>
}
