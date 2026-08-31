'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createTicket } from '@/app/actions/tickets'
import { ReporterType, TicketPriority } from '@prisma/client'

const formSchema = z.object({
  reporter_name: z.string().min(2, 'Name must be at least 2 characters'),
  reporter_type: z.nativeEnum(ReporterType),
  location_id: z.string().min(1, 'Please select a location'),
  category_id: z.string().min(1, 'Please select a category'),
  priority: z.nativeEnum(TicketPriority),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

type TicketFormProps = {
  locations: { id: string; name: string }[]
  categories: { id: string; name: string }[]
}

export function TicketForm({ locations, categories }: TicketFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporter_name: '',
      reporter_type: 'EMPLOYEE',
      location_id: '',
      category_id: '',
      priority: 'LOW',
      description: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const result = await createTicket(values)
      if (result.success) {
        toast.success(`Ticket Created: ${result.ticketNumber}`, {
          description: "Your maintenance request has been submitted successfully."
        })
        form.reset()
        // In a real flow, you might redirect to a public success page
      } else {
        toast.error(result.error)
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
        <h1 className="text-3xl font-bold tracking-tight text-white">Raise Ticket</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Submit a maintenance request for your facility.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="reporter_name"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Your Name</FormLabel>
                <FormControl>
                  <Input 
                    className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-red-500 transition-colors" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reporter_type"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">You are a(n)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl">
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location_id"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Location</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl max-h-64">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Issue Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl">
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

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Priority Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full rounded-md border border-zinc-800 bg-[#121214] px-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border border-zinc-800 bg-[#121214] text-white rounded-md shadow-xl">
                    <SelectItem value="LOW">Low (Routine)</SelectItem>
                    <SelectItem value="MEDIUM">Medium (Needs attention)</SelectItem>
                    <SelectItem value="HIGH">High (Urgent)</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-zinc-300">Issue Details</FormLabel>
                <FormControl>
                  <Textarea 
                    className="min-h-[160px] w-full rounded-md border border-zinc-800 bg-[#121214] p-4 text-sm text-white focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-red-500 resize-none transition-colors"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-8 pb-12">
            <Button 
              type="submit" 
              className="h-12 w-full rounded-md bg-red-600 text-base font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
