import { PrismaClient } from '@prisma/client'
import { hashMaintenanceCode, hashSecret, loginKey } from '../lib/password'
import { MAINTENANCE_BRANCHES, normalizeMaintenanceBranchName } from '../lib/maintenance-branches'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data...')

  // Categories (Both Ticket and Inventory)
  const catElectrical = await prisma.category.upsert({
    where: { name: 'Electrical' },
    update: { type: 'INVENTORY' },
    create: { name: 'Electrical', type: 'INVENTORY' },
  })
  
  const catPlumbing = await prisma.category.upsert({
    where: { name: 'Plumbing' },
    update: { type: 'INVENTORY' },
    create: { name: 'Plumbing', type: 'INVENTORY' },
  })
  
  const catHVAC = await prisma.category.upsert({
    where: { name: 'HVAC' },
    update: { type: 'INVENTORY' },
    create: { name: 'HVAC', type: 'INVENTORY' },
  })
  
  const catCivil = await prisma.category.upsert({
    where: { name: 'Civil' },
    update: { type: 'INVENTORY' },
    create: { name: 'Civil', type: 'INVENTORY' },
  })
  
  const catFurniture = await prisma.category.upsert({
    where: { name: 'Furniture' },
    update: { type: 'INVENTORY' },
    create: { name: 'Furniture', type: 'INVENTORY' },
  })

  const catIT = await prisma.category.upsert({
    where: { name: 'IT' },
    update: { type: 'INVENTORY' },
    create: { name: 'IT', type: 'INVENTORY' },
  })

  const catConsumables = await prisma.category.upsert({
    where: { name: 'Consumables' },
    update: { type: 'INVENTORY' },
    create: { name: 'Consumables', type: 'INVENTORY' },
  })

  // Inventory Items - Realistic Toyota Dealership List
  const items = [
    { code: 'INV-ELEC-001', name: 'LED Tube Light 20W', cat: catElectrical.id, unit: 'pcs', current: 50, min: 10, cost: 450.00, supp: 'Philips', loc: 'Aisle A1' },
    { code: 'INV-ELEC-002', name: 'MCB 16 Amp', cat: catElectrical.id, unit: 'pcs', current: 15, min: 5, cost: 250.00, supp: 'Schneider', loc: 'Aisle A2' },
    { code: 'INV-PLUM-001', name: 'PVC Pipe 1 inch', cat: catPlumbing.id, unit: 'm', current: 100, min: 20, cost: 85.00, supp: 'Supreme', loc: 'Rack B1' },
    { code: 'INV-PLUM-002', name: 'Toilet Flush Valve', cat: catPlumbing.id, unit: 'pcs', current: 3, min: 5, cost: 1200.00, supp: 'Jaquar', loc: 'Shelf B2' },
    { code: 'INV-HVAC-001', name: 'Air Filter - Workshop HVAC', cat: catHVAC.id, unit: 'pcs', current: 12, min: 10, cost: 850.00, supp: 'Voltas', loc: 'Store Rm 1' },
    { code: 'INV-HVAC-002', name: 'AC Refrigerant R32', cat: catHVAC.id, unit: 'kg', current: 25, min: 15, cost: 600.00, supp: 'Daikin', loc: 'Store Rm 2' },
    { code: 'INV-CIVL-001', name: 'Wall Paint - Toyota Red', cat: catCivil.id, unit: 'ltr', current: 40, min: 10, cost: 1100.00, supp: 'Asian Paints', loc: 'Paint Bay' },
    { code: 'INV-CIVL-002', name: 'Floor Cleaning Solution', cat: catConsumables.id, unit: 'ltr', current: 60, min: 20, cost: 150.00, supp: 'Diversey', loc: 'Cleaning Store' },
    { code: 'INV-FURN-001', name: 'Office Chair Caster Wheels', cat: catFurniture.id, unit: 'pcs', current: 24, min: 12, cost: 120.00, supp: 'Local', loc: 'Cabinet 1' },
    { code: 'INV-IT-001', name: 'LAN Cable CAT-6', cat: catIT.id, unit: 'box', current: 2, min: 1, cost: 2500.00, supp: 'D-Link', loc: 'IT Room' },
  ]

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { item_code: item.code },
      update: { 
        name: item.name,
        category_id: item.cat,
        unit: item.unit,
        current_stock: item.current,
        minimum_stock: item.min,
        unit_cost: item.cost,
        supplier: item.supp,
        storage_location: item.loc
      },
      create: {
        item_code: item.code,
        name: item.name,
        category_id: item.cat,
        unit: item.unit,
        current_stock: item.current,
        minimum_stock: item.min,
        unit_cost: item.cost,
        supplier: item.supp,
        storage_location: item.loc
      }
    })
  }

  const locations = await prisma.location.findMany({ where: { is_active: true }, select: { id: true, name: true } })
  const locationsByCanonicalName = new Map(locations.map((location) => [normalizeMaintenanceBranchName(location.name), location]))
  for (const branchDefinition of MAINTENANCE_BRANCHES) {
    const location = locationsByCanonicalName.get(branchDefinition.name)
    if (!location) throw new Error(`Missing active location for maintenance branch ${branchDefinition.name}`)
    const branch = await prisma.maintenanceBranch.upsert({ where: { location_id: location.id }, update: { name: branchDefinition.name, is_active: true }, create: { location_id: location.id, name: branchDefinition.name } })
    const code = branchDefinition.code
    await prisma.maintenanceAccount.upsert({
      where: { branch_id: branch.id },
      update: { login_key: loginKey(code), secret_hash: await hashMaintenanceCode(code), role: 'BRANCH', is_active: true },
      create: { branch_id: branch.id, login_key: loginKey(code), secret_hash: await hashMaintenanceCode(code), role: 'BRANCH', is_active: true },
    })
  }
  await prisma.maintenanceAccount.upsert({
    where: { email: 'admin@nippontoyota.com' },
    update: { secret_hash: await hashSecret('nippon2026'), role: 'ADMIN', branch_id: null, is_active: true },
    create: { email: 'admin@nippontoyota.com', secret_hash: await hashSecret('nippon2026'), role: 'ADMIN', branch_id: null, is_active: true },
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
