import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function TicketDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      location: true,
      category: true,
      materials: {
        include: {
          inventory_item: true
        }
      },
      status_history: {
        orderBy: { created_at: 'desc' }
      }
    }
  })

  if (!ticket) {
    notFound()
  }

  // Calculate raw material cost
  const rawMaterialCost = ticket.materials.reduce((total, mat) => {
    return total + (mat.quantity * Number(mat.unit_cost_at_time))
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{ticket.ticket_number}</h2>
          <p className="text-zinc-500">Reported on {format(ticket.created_at, 'dd MMM yyyy, h:mm a')}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="text-sm px-3 py-1 bg-[#161618] text-white border-zinc-800" variant="outline">{ticket.status}</Badge>
          <Badge className="text-sm px-3 py-1 border-transparent" style={{
            backgroundColor: ticket.priority === 'EMERGENCY' ? '#ef4444' : ticket.priority === 'HIGH' ? '#f59e0b' : '#3b82f6',
            color: 'white'
          }}>{ticket.priority}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Reporter</p>
                  <p className="font-medium text-white">{ticket.reporter_name} ({ticket.reporter_type})</p>
                </div>
                <div>
                  <p className="text-zinc-500">Location</p>
                  <p className="font-medium text-white">{ticket.location.name}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Category</p>
                  <p className="font-medium text-white">{ticket.category.name}</p>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Description</p>
                <div className="bg-[#161618] p-4 rounded-md text-sm border border-zinc-800 text-zinc-300">
                  {ticket.description}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Required Materials</CardTitle>
                <CardDescription className="text-zinc-500">Inventory items requested for this maintenance task</CardDescription>
              </div>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 border">Add Material</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Item</TableHead>
                    <TableHead className="text-right text-zinc-400">Qty</TableHead>
                    <TableHead className="text-right text-zinc-400">Unit Cost</TableHead>
                    <TableHead className="text-right text-zinc-400">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticket.materials.map((mat) => {
                    const total = mat.quantity * Number(mat.unit_cost_at_time);
                    return (
                      <TableRow key={mat.id} className="border-zinc-800 hover:bg-[#161618]">
                        <TableCell className="font-medium text-white">{mat.inventory_item.name}</TableCell>
                        <TableCell className="text-right text-zinc-300">{mat.quantity} {mat.inventory_item.unit}</TableCell>
                        <TableCell className="text-right text-zinc-300">₹{Number(mat.unit_cost_at_time).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium text-white">₹{total.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                  {ticket.materials.length === 0 && (
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center text-zinc-500 py-6">
                        No materials added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-6 flex justify-end">
                <div className="bg-[#161618] p-4 rounded-md min-w-[250px] border border-zinc-800">
                  <div className="flex justify-between font-bold text-white">
                    <span>Raw Material Cost:</span>
                    <span>₹{rawMaterialCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Approve Ticket</Button>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 border-zinc-700 border text-white">Request Information</Button>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Reject Ticket</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.status_history.map((history) => (
                  <div key={history.id} className="text-sm border-l-2 border-zinc-800 pl-4 py-1">
                    <p className="font-bold text-white">{history.status}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{format(history.created_at, 'dd MMM yyyy, h:mm a')}</p>
                    {history.notes && <p className="text-zinc-400 mt-1.5">{history.notes}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
