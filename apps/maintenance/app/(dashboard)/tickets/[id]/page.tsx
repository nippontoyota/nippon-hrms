import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { updateTicketStatus } from '@/app/actions/tickets'

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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{ticket.ticket_number}</h2>
          <p className="text-muted-foreground text-sm">Reported on {format(ticket.created_at, 'dd MMM yyyy, h:mm a')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="text-sm px-3 py-1 bg-accent text-foreground border-border" variant="outline">{ticket.status}</Badge>
          <Badge className="text-sm px-3 py-1 border-transparent" style={{
            backgroundColor: ticket.priority === 'EMERGENCY' ? '#ef4444' : ticket.priority === 'HIGH' ? '#f59e0b' : '#3b82f6',
            color: 'white'
          }}>{ticket.priority}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border text-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-accent p-3 rounded-md border border-border/50">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Reporter</p>
                  <p className="font-medium text-foreground">{ticket.reporter_name}</p>
                </div>
                <div className="bg-accent p-3 rounded-md border border-border/50">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Location</p>
                  <p className="font-medium text-foreground">{ticket.location.name}</p>
                </div>
                <div className="bg-accent p-3 rounded-md border border-border/50 sm:col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Category</p>
                  <p className="font-medium text-foreground">{ticket.category.name}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Description</p>
                <div className="bg-accent p-4 rounded-md text-sm border border-border text-foreground whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
              {ticket.image_url && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Submitted photo</p>
                  <a href={ticket.image_url} target="_blank" rel="noreferrer" className="block rounded-md border border-border overflow-hidden bg-accent max-w-xl">
                    <img src={ticket.image_url} alt={ticket.image_caption || `Photo for ${ticket.ticket_number}`} className="max-h-96 w-full object-contain" />
                  </a>
                  {ticket.image_caption && <p className="text-sm text-muted-foreground mt-2">{ticket.image_caption}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Required Materials</CardTitle>
                <CardDescription className="text-muted-foreground">Inventory items assigned to fix this issue</CardDescription>
              </div>
              <Button size="sm" className="w-full sm:w-auto bg-muted hover:bg-zinc-700 text-foreground border-zinc-700 border">Add Material</Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground whitespace-nowrap">Item</TableHead>
                      <TableHead className="text-right text-muted-foreground whitespace-nowrap">Qty</TableHead>
                      <TableHead className="text-right text-muted-foreground whitespace-nowrap">Unit Cost</TableHead>
                      <TableHead className="text-right text-muted-foreground whitespace-nowrap">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticket.materials.map((mat) => {
                      const total = mat.quantity * Number(mat.unit_cost_at_time);
                      return (
                        <TableRow key={mat.id} className="border-border hover:bg-accent">
                          <TableCell className="font-medium text-foreground whitespace-nowrap">{mat.inventory_item.name}</TableCell>
                          <TableCell className="text-right text-foreground whitespace-nowrap">{mat.quantity} {mat.inventory_item.unit}</TableCell>
                          <TableCell className="text-right text-foreground whitespace-nowrap">₹{Number(mat.unit_cost_at_time).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-foreground whitespace-nowrap">₹{total.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                    {ticket.materials.length === 0 && (
                      <TableRow className="border-border hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                          No materials added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6 mx-4 sm:mx-0 flex justify-end pb-4 sm:pb-0">
                <div className="bg-accent p-4 rounded-md w-full sm:w-auto sm:min-w-[250px] border border-border">
                  <div className="flex justify-between font-bold text-foreground text-lg">
                    <span>Total Cost:</span>
                    <span className="text-red-400">₹{rawMaterialCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border text-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={updateTicketStatus}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="status" value="IN_PROGRESS" />
                <Button type="submit" disabled={ticket.status === 'IN_PROGRESS' || ticket.status === 'CLOSED'} className="w-full bg-blue-600 hover:bg-blue-700 text-foreground font-semibold">Mark In Progress</Button>
              </form>
              <form action={updateTicketStatus}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="status" value="COMPLETED" />
                <Button type="submit" disabled={ticket.status === 'COMPLETED' || ticket.status === 'CLOSED'} className="w-full bg-green-600 hover:bg-green-700 text-foreground font-semibold">Mark as Resolved</Button>
              </form>
              <form action={updateTicketStatus}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="status" value="CLOSED" />
                <Button type="submit" disabled={ticket.status === 'CLOSED'} className="w-full bg-muted hover:bg-zinc-700 border-zinc-700 border text-foreground">Close Ticket</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.status_history.map((history) => (
                  <div key={history.id} className="text-sm border-l-2 border-border pl-4 py-1 relative">
                    <div className="absolute w-2 h-2 bg-zinc-700 rounded-full -left-[5px] top-2"></div>
                    <p className="font-bold text-foreground">{history.status}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{format(history.created_at, 'dd MMM yyyy, h:mm a')}</p>
                    {history.notes && <p className="text-muted-foreground mt-1.5 bg-accent p-2 rounded text-xs border border-border/50">{history.notes}</p>}
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
