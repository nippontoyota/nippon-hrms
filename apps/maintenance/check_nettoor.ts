import { PrismaClient } from '@prisma/client'
import { createHmac } from 'node:crypto'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

function loginKey(value: string) {
  const secret = process.env.MAINTENANCE_SESSION_SECRET
  if (!secret) throw new Error('MAINTENANCE_SESSION_SECRET is not configured')
  return createHmac('sha256', secret).update(value.trim().toUpperCase()).digest('base64url')
}

async function run() {
  const branchCode = 'CO01A'
  console.log("Locally computed login_key for CO01A:", loginKey(branchCode))
  
  const branch = await prisma.maintenanceBranch.findFirst({ where: { name: 'Nettoor' } })
  if (branch) {
    const account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: branch.id } })
    console.log("DB login_key for CO01A:", account?.login_key)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
