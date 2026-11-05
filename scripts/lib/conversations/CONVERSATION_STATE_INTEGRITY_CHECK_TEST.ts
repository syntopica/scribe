import assert from 'node:assert/strict'
import test from 'node:test'
import { CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS } from './constants/CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { isConversationStateIntegrityCheckDue } from './isConversationStateIntegrityCheckDue'
import { openConversationArchiveState } from './openConversationArchiveState'

// The full integrity check reads the whole state file: 96 s on the live 20 GB
// state. These pin that it runs on the first open and then at most daily, not
// on every open a refresh makes.
void test('an integrity check is due without a stamp, after a day, or with a future stamp', () => {
  const now = Date.parse('2026-11-05T12:00:00.000Z')
  assert.equal(isConversationStateIntegrityCheckDue(undefined, now), true)
  assert.equal(isConversationStateIntegrityCheckDue('not a date', now), true)
  assert.equal(
    isConversationStateIntegrityCheckDue(
      new Date(
        now - CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS,
      ).toISOString(),
      now,
    ),
    true,
  )
  assert.equal(
    isConversationStateIntegrityCheckDue(
      new Date(now + 60_000).toISOString(),
      now,
    ),
    true,
  )
  assert.equal(
    isConversationStateIntegrityCheckDue(
      new Date(now - 60_000).toISOString(),
      now,
    ),
    false,
  )
})

void test('opening the state stamps the check and a second open keeps the stamp', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  const options = {
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  }
  const first = await openConversationArchiveState(options)
  const stamped = first.state.meta('integrityCheckedAt')
  assert.ok(stamped)
  first.state.close()

  const second = await openConversationArchiveState(options)
  assert.equal(second.state.meta('integrityCheckedAt'), stamped)
  second.state.close()
})
