import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const HASH_VERSION = 'pbkdf2-sha256-v1'
const ITERATIONS = 310_000
const KEY_LENGTH = 32
const SESSION_TTL_SECONDS = 8 * 60 * 60

function bytesToBase64(bytes: Uint8Array) { return Buffer.from(bytes).toString('base64url') }
function base64ToBytes(value: string) { return new Uint8Array(Buffer.from(value, 'base64url')) }

export async function hashSecret(secret: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, KEY_LENGTH * 8)
  return `${HASH_VERSION}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`
}

function codeEncryptionKey() {
  const secret = process.env.MAINTENANCE_CODE_SECRET || process.env.MAINTENANCE_SESSION_SECRET
  if (!secret) throw new Error('MAINTENANCE_CODE_SECRET or MAINTENANCE_SESSION_SECRET is not configured')
  return createHash('sha256').update(secret).digest()
}

function encryptMaintenanceCode(code: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', codeEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
  return `recovery-v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function recoverMaintenanceCode(encoded: string) {
  const recovery = encoded.split('$').find((part) => part.startsWith('recovery-v1.'))
  if (!recovery) return null
  const [, ivText, tagText, ciphertextText] = recovery.split('.')
  if (!ivText || !tagText || !ciphertextText) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', codeEncryptionKey(), Buffer.from(ivText, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

export async function hashMaintenanceCode(code: string) {
  return `${await hashSecret(code)}$${encryptMaintenanceCode(code.trim().toUpperCase())}`
}

export async function verifySecret(secret: string, encoded: string) {
  const [version, iterationText, saltText, digestText] = encoded.split('$')
  const iterations = Number(iterationText)
  if (version !== HASH_VERSION || !Number.isInteger(iterations) || iterations < 100_000 || !saltText || !digestText) return false
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64ToBytes(saltText), iterations, hash: 'SHA-256' }, key, KEY_LENGTH * 8)
    const actual = Buffer.from(new Uint8Array(bits))
    const expected = Buffer.from(base64ToBytes(digestText))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch { return false }
}

export function loginKey(value: string) {
  const secret = process.env.MAINTENANCE_SESSION_SECRET
  if (!secret) throw new Error('MAINTENANCE_SESSION_SECRET is not configured')
  return createHmac('sha256', secret).update(value.trim().toUpperCase()).digest('base64url')
}

export function sessionTtlSeconds() { return SESSION_TTL_SECONDS }
