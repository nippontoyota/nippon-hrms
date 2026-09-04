import { createHmac, timingSafeEqual } from 'node:crypto'

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
