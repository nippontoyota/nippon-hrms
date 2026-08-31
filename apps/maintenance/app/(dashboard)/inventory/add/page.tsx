import prisma from '@/lib/prisma'
import { ItemForm } from './item-form'
import { PageTransition } from '@/components/ui/page-transition'

export const dynamic = 'force-dynamic'

export default async function AddInventoryItemPage() {
  const categories = await prisma.category.findMany({
    where: { is_active: true, type: 'INVENTORY' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <PageTransition className="p-4 md:p-6 max-w-4xl mx-auto">
      <ItemForm categories={categories} />
    </PageTransition>
  )
}
