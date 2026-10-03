import { PrismaClient } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

function base64ToBytes(value: string) { return new Uint8Array(Buffer.from(value, 'base64url')) }

async function verifySecret(secret: string, encoded: string) {
  const [version, iterationText, saltText, digestText] = encoded.split('$')
  const iterations = Number(iterationText)
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64ToBytes(saltText), iterations, hash: 'SHA-256' }, key, 32 * 8)
    const actual = Buffer.from(new Uint8Array(bits))
    const expected = Buffer.from(base64ToBytes(digestText))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch (e) { 
    console.error(e)
    return false 
  }
}

function loginKey(value: string) {
  const secret = process.env.MAINTENANCE_SESSION_SECRET
  if (!secret) throw new Error('MAINTENANCE_SESSION_SECRET is not configured')
  return createHmac('sha256', secret).update(value.trim().toUpperCase()).digest('base64url')
}

async function run() {
  const branchCode = 'CO01B'
  const account = await prisma.maintenanceAccount.findFirst({ 
    where: { login_key: loginKey(branchCode), role: 'BRANCH', is_active: true } 
  })
  
  if (!account) {
    console.log("Account not found by login_key!")
    return
  }
  
  console.log("Found account:", account.id)
  
  const isValid = await verifySecret(branchCode, account.secret_hash)
  console.log("VerifySecret returned:", isValid)
}

run().catch(console.error).finally(() => prisma.$disconnect())
