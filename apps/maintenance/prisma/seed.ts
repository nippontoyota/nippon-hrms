import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data...')

  // Categories
  const catElectrical = await prisma.category.upsert({
    where: { name: 'Electrical' },
    update: {},
    create: { name: 'Electrical', type: 'TICKET' },
  })
  
  const catPlumbing = await prisma.category.upsert({
    where: { name: 'Plumbing' },
    update: {},
    create: { name: 'Plumbing', type: 'TICKET' },
  })
  
  const catHVAC = await prisma.category.upsert({
    where: { name: 'HVAC' },
    update: {},
    create: { name: 'HVAC', type: 'TICKET' },
  })
  
  const catCivil = await prisma.category.upsert({
    where: { name: 'Civil' },
    update: {},
    create: { name: 'Civil', type: 'TICKET' },
  })
  
  const catFurniture = await prisma.category.upsert({
    where: { name: 'Furniture' },
    update: {},
    create: { name: 'Furniture', type: 'TICKET' },
  })

  const catIT = await prisma.category.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT', type: 'TICKET' },
  })

  // Locations
  const locMainOffice = await prisma.location.upsert({
    where: { name: 'Main Office' },
    update: {},
    create: { name: 'Main Office' },
  })

  const locWorkshop = await prisma.location.upsert({
    where: { name: 'Service Workshop' },
    update: {},
    create: { name: 'Service Workshop' },
  })
  
  const locShowroom = await prisma.location.upsert({
    where: { name: 'Showroom' },
    update: {},
    create: { name: 'Showroom' },
  })

  // Inventory Items
  await prisma.inventoryItem.upsert({
    where: { item_code: 'INV-ELEC-001' },
    update: {},
    create: {
      item_code: 'INV-ELEC-001',
      name: 'LED Tube Light 20W',
      category_id: catElectrical.id,
      unit: 'Piece',
      current_stock: 50,
      minimum_stock: 10,
      unit_cost: 450.00,
      supplier: 'Philips',
      storage_location: 'Shelf A1'
    }
  })

  await prisma.inventoryItem.upsert({
    where: { item_code: 'INV-PLUM-001' },
    update: {},
    create: {
      item_code: 'INV-PLUM-001',
      name: 'PVC Pipe 1 inch',
      category_id: catPlumbing.id,
      unit: 'Meter',
      current_stock: 100,
      minimum_stock: 20,
      unit_cost: 85.00,
      supplier: 'Supreme',
      storage_location: 'Shelf B2'
    }
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
