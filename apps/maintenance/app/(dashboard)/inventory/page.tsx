import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, AlertTriangle, PackageOpen, MoreVertical, Search } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
      category: true,
    },
    orderBy: {
      name: 'asc'
    }
  })

  const lowStockCount = inventoryItems.filter(item => item.current_stock <= item.minimum_stock).length
  const totalItems = inventoryItems.length
  
  return (
    <PageTransition className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Inventory</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage stock and materials</p>
        </div>
        <Link href="/inventory/add">
          <button className="flex items-center justify-center h-10 w-10 md:w-auto md:px-4 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
            <Plus className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Add Item</span>
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">Total Items</span>
              <PackageOpen className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-3xl font-bold text-white">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-amber-500">Low Stock</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-500">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-Optimized Inventory List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
          <h3 className="text-lg font-semibold text-white">Current Stock</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            <input 
              type="search" 
              placeholder="Fast lookup..." 
              className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-shadow"
            />
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {inventoryItems.map((item) => {
            const isLowStock = item.current_stock <= item.minimum_stock;
            const isOut = item.current_stock === 0;

            return (
              <Card key={item.id} className="bg-card border border-border shadow-sm hover:bg-[#252528] transition-colors overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 flex justify-between items-start">
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500 bg-[#111] px-2 py-0.5 rounded">
                          {item.item_code}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-base leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-400">{item.category.name}</p>
                    </div>
                    
                    <button className="text-zinc-500 hover:text-white p-1 -mr-2 -mt-1">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="px-4 py-3 bg-[#111]/50 border-t border-[#222] flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Stock</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isOut ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-white'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs text-zinc-400">{item.unit}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Unit Price</span>
                      <span className="text-sm font-medium text-white">₹{item.unit_cost.toString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {inventoryItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No inventory items found.
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
