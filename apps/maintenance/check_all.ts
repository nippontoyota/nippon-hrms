import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function run() {
  const branch = await prisma.maintenanceBranch.findFirst({ where: { name: 'Kalamaserry' } })
  if (branch) {
    const accounts = await prisma.maintenanceAccount.findMany({ where: { branch_id: branch.id } })
    console.log("ALL Accounts for Kalamaserry:", accounts)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
