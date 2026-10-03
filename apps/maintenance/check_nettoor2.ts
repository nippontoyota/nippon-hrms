import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function run() {
  const branch = await prisma.maintenanceBranch.findFirst({ where: { name: 'Nettor' } })
  if (branch) {
    const account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: branch.id } })
    console.log("DB secret_hash for CO01A:", account?.secret_hash)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
