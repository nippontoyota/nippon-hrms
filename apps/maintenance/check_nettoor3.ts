import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function run() {
  const branch = await prisma.maintenanceBranch.findFirst({ where: { name: 'Nettor' } })
  if (branch) {
    const account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: branch.id } })
    console.log("ACTUAL DB login_key for CO01A:", account?.login_key)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
