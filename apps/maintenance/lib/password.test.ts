import assert from 'node:assert/strict'
import test from 'node:test'
import { hashMaintenanceCode, loginKey, recoverMaintenanceCode, verifySecret } from './password'

process.env.MAINTENANCE_SESSION_SECRET = 'maintenance-test-session-secret'
process.env.MAINTENANCE_CODE_SECRET = 'maintenance-test-code-secret'

test('maintenance code hashes verify and preserve recoverable display code', async () => {
  const encoded = await hashMaintenanceCode('AB12C')

  assert.equal(await verifySecret('AB12C', encoded), true)
  assert.equal(await verifySecret('WRONG', encoded), false)
  assert.equal(recoverMaintenanceCode(encoded), 'AB12C')
})

test('login keys canonicalize code formatting', () => {
  assert.equal(loginKey('ab12c'), loginKey(' AB12C '))
})

test('malformed hashes fail closed', async () => {
  assert.equal(await verifySecret('AB12C', 'not-a-hash'), false)
  assert.equal(recoverMaintenanceCode('not-a-hash'), null)
})
