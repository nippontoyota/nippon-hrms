'use client'

import { useState } from 'react'
import { AlertTriangle, AlertCircle, ShoppingCart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

type LowStockItem = {
  id: string
  item_code: string
  name: string
  current_stock: number
  minimum_stock: number
  unit: string
  supplier: string | null
  category: { name: string }
}

export function LowStockCard({ items }: { items: LowStockItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="bg-card border border-border shadow-sm hover:bg-accent transition-colors cursor-pointer group rounded-xl text-left outline-none block w-full">
        <div className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-amber-500 group-hover:text-amber-400 transition-colors">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-amber-500 group-hover:text-amber-400 transition-colors">{items.length}</div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px] bg-slate-50 border-slate-200 text-slate-900 max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-white border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            Low Stock Alerts
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium mt-1">
            You have {items.length} items that are at or below their minimum required stock levels.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 bg-slate-50">
          <div className="space-y-3 py-4">
            {items.map((item) => {
              const isOut = item.current_stock === 0
              
              return (
                <div key={item.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.item_code}
                        </span>
                        {isOut ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-[15px] leading-tight">{item.name}</h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{item.category.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 mt-1 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Current</span>
                      <span className="text-lg font-black text-red-600">
                        {item.current_stock} <span className="text-xs font-semibold text-red-600/70">{item.unit}</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Minimum</span>
                      <span className="text-lg font-bold text-slate-700">
                        {item.minimum_stock} <span className="text-xs font-semibold text-slate-400">{item.unit}</span>
                      </span>
                    </div>
                    
                    {item.supplier && (
                      <div className="flex flex-col justify-start">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5 block">Supplier</span>
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-1">
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{item.supplier}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {items.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm font-medium">
                All inventory items are sufficiently stocked!
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <Button variant="outline" className="border-slate-200 hover:bg-slate-50 font-semibold" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
