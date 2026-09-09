import assert from 'node:assert/strict'
import test from 'node:test'
import { businessDayCutoff, isUnattended } from './queue-state'

test('business day cutoff skips Sundays', () => {
  const now = new Date('2026-09-09T12:00:00+05:30')
  const cutoff = businessDayCutoff(now, 3)

  assert.notEqual(cutoff.getDay(), 0)
  assert.equal(cutoff.toISOString().slice(0, 10), '2026-09-05')
})

test('unattended check includes equality at the cutoff', () => {
  const now = new Date('2026-09-09T12:00:00+05:30')
  const cutoff = businessDayCutoff(now, 3)

  assert.equal(isUnattended(cutoff, now), true)
  assert.equal(isUnattended(new Date(cutoff.getTime() + 1), now), false)
})
