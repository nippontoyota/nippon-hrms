import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, AlertTriangle, PackageOpen, MoreVertical, Search } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { LowStockCard } from './low-stock-card'

import { InventoryItemActions } from './inventory-item-actions'

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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage stock and materials</p>
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
              <span className="text-sm font-medium text-muted-foreground">Total Items</span>
              <PackageOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold text-foreground">{totalItems}</div>
          </CardContent>
        </Card>
        <LowStockCard items={inventoryItems
          .filter(item => item.current_stock <= item.minimum_stock)
          .map(item => ({
            id: item.id,
            item_code: item.item_code,
            name: item.name,
            current_stock: item.current_stock,
            minimum_stock: item.minimum_stock,
            unit: item.unit,
            supplier: item.supplier,
            category: { name: item.category.name }
          }))} 
        />
      </div>

      {/* Mobile-Optimized Inventory List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
          <h3 className="text-lg font-semibold text-foreground">Current Stock</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input 
              type="search" 
              placeholder="Fast lookup..." 
              className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500 transition-shadow"
            />
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {inventoryItems.map((item) => {
            const isLowStock = item.current_stock <= item.minimum_stock;
            const isOut = item.current_stock === 0;

            return (
              <Card key={item.id} className="bg-card border border-border shadow-sm hover:shadow-md hover:bg-slate-50 transition-all overflow-hidden group">
                <CardContent className="p-0">
                  <div className="p-4 flex justify-between items-start">
                    <div className="space-y-1.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.item_code}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight group-hover:text-red-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs font-medium text-slate-500">{item.category.name}</p>
                    </div>
                    
                    <InventoryItemActions itemId={item.id} itemName={item.name} />
                  </div>
                  
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Stock</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-black ${isOut ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Unit Price</span>
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        ₹{item.unit_cost.toString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {inventoryItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No inventory items found.
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
