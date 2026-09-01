'use client'

import { useState, useTransition } from 'react'
import { MoreVertical, Trash, Edit } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { deleteInventoryItem } from '@/app/actions/inventory'
import { toast } from 'sonner'

export function InventoryItemActions({ itemId, itemName }: { itemId: string, itemName: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete ${itemName}?`)) return
    
    startTransition(async () => {
      const result = await deleteInventoryItem(itemId)
      if (result.success) {
        toast.success(`${itemName} deleted.`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-1 -mr-2 -mt-1 disabled:opacity-50 outline-none" disabled={isPending}>
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 border-border bg-card text-foreground">
        <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={() => toast.info('Edit coming soon')}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-500 focus:bg-red-950 focus:text-red-500 cursor-pointer" onClick={handleDelete}>
          <Trash className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
