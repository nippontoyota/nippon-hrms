import Link from 'next/link'
import { requireMaintenanceSession } from '@/lib/maintenance-auth'
import prisma from '@/lib/prisma'
import { TransferDecision } from '@/components/transfers/transfer-controls'

export const dynamic = 'force-dynamic'

export default async function TransfersPage() {
  const session = await requireMaintenanceSession()
  const where = session.role === 'ADMIN'
    ? {}
    : { OR: [{ source_branch_id: session.branchId as string }, { destination_branch_id: session.branchId as string }] }
  const transfers = await prisma.ticketTransfer.findMany({
    where,
    include: {
      ticket: { select: { id: true, ticket_number: true, description: true } },
      source_branch: { select: { name: true } },
      destination_branch: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  })

  return (
    <div className="min-h-full bg-[#f4f6fa] p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-950">Ticket transfers</h1>
        <p className="mt-1 text-sm text-slate-500">Review requests between maintenance branches.</p>
        <div className="mt-6 space-y-3">
          {transfers.length ? transfers.map((transfer) => (
            <article key={transfer.id} className="border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <Link href={`/tickets/${transfer.ticket.id}`} className="font-bold text-red-600 hover:underline">{transfer.ticket.ticket_number}</Link>
                  <p className="mt-1 text-sm text-slate-700">{transfer.source_branch.name} to {transfer.destination_branch.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{transfer.reason}</p>
                </div>
                <span className="h-fit border border-slate-200 px-2 py-1 text-xs font-bold uppercase text-slate-600">{transfer.status}</span>
              </div>
              {transfer.status === 'PENDING' && (session.role === 'ADMIN' || transfer.destination_branch_id === session.branchId) && <div className="mt-4 max-w-sm"><TransferDecision transferId={transfer.id} /></div>}
            </article>
          )) : <div className="border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No transfer requests.</div>}
        </div>
      </div>
    </div>
  )
}
