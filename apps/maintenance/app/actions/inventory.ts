'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createInventoryItem(data: {
  item_code: string
  name: string
  category_id: string
  unit: string
  current_stock: number
  minimum_stock: number
  unit_cost: number
  supplier?: string
  storage_location?: string
}) {
  try {
    // Check for existing item code
    const existing = await prisma.inventoryItem.findUnique({
      where: { item_code: data.item_code }
    })
    
    if (existing) {
      return { success: false, error: 'An item with this code already exists.' }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        item_code: data.item_code,
        name: data.name,
        category_id: data.category_id,
        unit: data.unit,
        current_stock: data.current_stock,
        minimum_stock: data.minimum_stock,
        unit_cost: data.unit_cost,
        supplier: data.supplier,
        storage_location: data.storage_location,
      }
    })

    revalidatePath('/inventory')
    return { success: true, item }
  } catch (error) {
    console.error('Failed to create inventory item:', error)
    return { success: false, error: 'Failed to create inventory item. Please try again.' }
  }
}
