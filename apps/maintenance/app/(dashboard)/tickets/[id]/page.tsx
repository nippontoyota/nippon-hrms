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
    <div className="space-y-6 p-4 md:p-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{ticket.ticket_number}</h2>
          <p className="text-zinc-500 text-sm">Reported on {format(ticket.created_at, 'dd MMM yyyy, h:mm a')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="text-sm px-3 py-1 bg-[#161618] text-white border-zinc-800" variant="outline">{ticket.status}</Badge>
          <Badge className="text-sm px-3 py-1 border-transparent" style={{
            backgroundColor: ticket.priority === 'EMERGENCY' ? '#ef4444' : ticket.priority === 'HIGH' ? '#f59e0b' : '#3b82f6',
            color: 'white'
          }}>{ticket.priority}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#161618] p-3 rounded-md border border-zinc-800/50">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Reporter</p>
                  <p className="font-medium text-white">{ticket.reporter_name}</p>
                </div>
                <div className="bg-[#161618] p-3 rounded-md border border-zinc-800/50">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Location</p>
                  <p className="font-medium text-white">{ticket.location.name}</p>
                </div>
                <div className="bg-[#161618] p-3 rounded-md border border-zinc-800/50 sm:col-span-2">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Category</p>
                  <p className="font-medium text-white">{ticket.category.name}</p>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Description</p>
                <div className="bg-[#161618] p-4 rounded-md text-sm border border-zinc-800 text-zinc-300 whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#121214] border-zinc-800 text-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Required Materials</CardTitle>
                <CardDescription className="text-zinc-500">Inventory items assigned to fix this issue</CardDescription>
              </div>
              <Button size="sm" className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 border">Add Material</Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 whitespace-nowrap">Item</TableHead>
                      <TableHead className="text-right text-zinc-400 whitespace-nowrap">Qty</TableHead>
                      <TableHead className="text-right text-zinc-400 whitespace-nowrap">Unit Cost</TableHead>
                      <TableHead className="text-right text-zinc-400 whitespace-nowrap">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticket.materials.map((mat) => {
                      const total = mat.quantity * Number(mat.unit_cost_at_time);
                      return (
                        <TableRow key={mat.id} className="border-zinc-800 hover:bg-[#161618]">
                          <TableCell className="font-medium text-white whitespace-nowrap">{mat.inventory_item.name}</TableCell>
                          <TableCell className="text-right text-zinc-300 whitespace-nowrap">{mat.quantity} {mat.inventory_item.unit}</TableCell>
                          <TableCell className="text-right text-zinc-300 whitespace-nowrap">₹{Number(mat.unit_cost_at_time).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-white whitespace-nowrap">₹{total.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                    {ticket.materials.length === 0 && (
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center text-zinc-500 py-8 text-sm">
                          No materials added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6 mx-4 sm:mx-0 flex justify-end pb-4 sm:pb-0">
                <div className="bg-[#161618] p-4 rounded-md w-full sm:w-auto sm:min-w-[250px] border border-zinc-800">
                  <div className="flex justify-between font-bold text-white text-lg">
                    <span>Total Cost:</span>
                    <span className="text-red-400">₹{rawMaterialCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">Mark In Progress</Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">Mark as Resolved</Button>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 border-zinc-700 border text-white">Cancel Ticket</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#121214] border-zinc-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.status_history.map((history) => (
                  <div key={history.id} className="text-sm border-l-2 border-zinc-800 pl-4 py-1 relative">
                    <div className="absolute w-2 h-2 bg-zinc-700 rounded-full -left-[5px] top-2"></div>
                    <p className="font-bold text-white">{history.status}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{format(history.created_at, 'dd MMM yyyy, h:mm a')}</p>
                    {history.notes && <p className="text-zinc-400 mt-1.5 bg-[#161618] p-2 rounded text-xs border border-zinc-800/50">{history.notes}</p>}
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
