import assert from 'node:assert/strict'
import test from 'node:test'
import { CONVERSATION_STATE_BATCH_SIZE } from './constants/CONVERSATION_STATE_BATCH_SIZE'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { openConversationArchiveState } from './openConversationArchiveState'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

void test('a replay across several write batches materializes and marks every conversation', async (context) => {
  const total = CONVERSATION_STATE_BATCH_SIZE * 2 + 1
  const archive = await seedConversationSegmentArchive(
    context,
    Array.from({ length: total }, (_, index) =>
      createConversationFragment({ id: `c${String(index)}`, events: 1 }),
    ),
  )
  const opened = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  try {
    assert.equal(opened.state.counts().conversations, total)
    assert.equal(opened.state.counts().pending, total)
  } finally {
    opened.state.close()
  }

  const verified = await verifyConversationSegmentArchive({
    root: archive.root,
  })
  assert.equal(verified.ok, true)
  assert.equal(verified.conversations, total)
  assert.equal(verified.events, total)
})

void test('a state transaction rolls back as a whole, nested writes included', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  const opened = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  try {
    opened.state.clearPendingDeliveries(['c1'])
    assert.throws(
      () =>
        opened.state.transaction(() => {
          opened.state.markPending(['c1'])
          throw new Error('interrupted')
        }),
      /interrupted/,
    )
    assert.deepEqual(opened.state.pendingDeliveries(), [])

    opened.state.transaction(() => {
      opened.state.markPending(['c1'])
    })
    assert.deepEqual(opened.state.pendingDeliveries(), ['c1'])
  } finally {
    opened.state.close()
  }
})
