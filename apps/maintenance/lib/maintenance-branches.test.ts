import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAINTENANCE_BRANCHES,
  branchDefinitionForCode,
  isCanonicalMaintenanceBranchName,
  normalizeMaintenanceBranchName,
} from './maintenance-branches'

test('maintenance branch catalog has unique canonical names and codes', () => {
  assert.equal(MAINTENANCE_BRANCHES.length, 12)
  assert.equal(new Set(MAINTENANCE_BRANCHES.map((branch) => branch.name)).size, 12)
  assert.equal(new Set(MAINTENANCE_BRANCHES.map((branch) => branch.code)).size, 12)
})

test('maintenance branch aliases normalize to canonical names', () => {
  assert.equal(normalizeMaintenanceBranchName('Trichur_SM'), 'Thrissur')
  assert.equal(normalizeMaintenanceBranchName('Nettoo'), 'Nettoor')
  assert.equal(normalizeMaintenanceBranchName('bp kalamassery'), 'B&P Kalamassery')
  assert.equal(normalizeMaintenanceBranchName('b&p kalamaserry'), 'B&P Kalamassery')
  assert.equal(isCanonicalMaintenanceBranchName('Kalamaserry_SM'), true)
  assert.equal(isCanonicalMaintenanceBranchName('B&P Kalamassery'), true)
  assert.equal(normalizeMaintenanceBranchName(' Unknown '), 'Unknown')
})

test('branch codes are trimmed and case-insensitive', () => {
  assert.equal(branchDefinitionForCode(' ir01a ')?.name, 'Irinjalakuda')
  assert.equal(branchDefinitionForCode(' co01e ')?.name, 'B&P Kalamassery')
  assert.equal(branchDefinitionForCode('not-a-code'), undefined)
})
