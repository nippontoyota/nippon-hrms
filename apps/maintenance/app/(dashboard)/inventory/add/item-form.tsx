'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createInventoryItem } from '@/app/actions/inventory'

const formSchema = z.object({
  item_code: z.string().min(2, 'Item code is required'),
  name: z.string().min(2, 'Name is required'),
  category_id: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  current_stock: z.coerce.number().min(0, 'Must be at least 0'),
  minimum_stock: z.coerce.number().min(0, 'Must be at least 0'),
  unit_cost: z.coerce.number().min(0, 'Must be at least 0'),
  supplier: z.string().optional(),
  storage_location: z.string().optional(),
})

type ItemFormProps = {
  categories: { id: string; name: string }[]
}

export function ItemForm({ categories }: ItemFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_code: '',
      name: '',
      category_id: '',
      unit: 'pcs',
      current_stock: 0,
      minimum_stock: 5,
      unit_cost: 0,
      supplier: '',
      storage_location: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const result = await createInventoryItem(values)
      if (result.success) {
        toast.success(`Item Created: ${values.item_code}`, {
          description: "Inventory item has been successfully added."
        })
        router.push('/inventory')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create item')
      }
    } catch (e) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto relative pt-8">
      {/* Sleek Back Button */}
      <button 
        onClick={() => router.back()} 
        className="absolute top-0 left-0 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </button>

      <div className="mb-10 text-left mt-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Add Inventory Item</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Register a new material or spare part into the system.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="item_code"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Item Code</FormLabel>
                  <FormControl>
                    <Input 
                      className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 uppercase transition-colors" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Unit Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl">
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="ltr">Liters (ltr)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="roll">Roll</SelectItem>
                      <SelectItem value="m">Meters (m)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Item Name</FormLabel>
                <FormControl>
                  <Input 
                    className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl max-h-64">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="current_stock"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Current Stock</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimum_stock"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Minimum Stock</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Unit Cost ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storage_location"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">Aisle/Bin</FormLabel>
                  <FormControl>
                    <Input 
                      className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-8 pb-12">
            <Button 
              type="submit" 
              className="h-12 w-full rounded-md bg-red-600 text-base font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
