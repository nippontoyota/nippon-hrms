import { requireMaintenanceAdmin } from '@/lib/maintenance-auth'
import { listBranchAccounts } from '@/app/actions/maintenance'
import { BranchManagement } from '@/components/admin/branch-management'

export const dynamic = 'force-dynamic'

export default async function BranchesPage() {
  await requireMaintenanceAdmin()
  const branches = await listBranchAccounts()
  return <div className="min-h-full bg-[#f4f6fa] p-5 sm:p-8"><div className="mx-auto max-w-5xl"><h1 className="text-2xl font-bold text-slate-950">Branch accounts</h1><p className="mt-1 text-sm text-slate-500">Create and rotate branch login codes. The current code is never shown.</p><BranchManagement branches={branches} /></div></div>
}
