import assert from 'node:assert/strict'
import test from 'node:test'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { hashConversationFragment } from './hashConversationFragment'
import { openConversationArchiveState } from './openConversationArchiveState'
import { publishConversationSegment } from './publishConversationSegment'
import { serializeConversationSegment } from './serializeConversationSegment'

void test('state replays the segments it has not seen and materializes them', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  const first = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  assert.equal(first.replayed, 1)
  assert.equal(first.state.counts().conversations, 1)
  assert.equal(first.state.conversation('c1')?.events.length, 3)
  first.state.close()

  // A second open must not re-read a segment it already ingested: replay cost
  // has to track new segments, not archive size, or an hourly refresh pays for
  // the whole corpus again.
  const second = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  assert.equal(second.replayed, 0)
  assert.equal(second.state.counts().fragments, 1)
  second.state.close()
})

void test('a longer fragment of the same conversation adds events, never replaces them', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  await publishConversationSegment({
    segmentsDirectory: archive.segments,
    text: serializeConversationSegment({
      fragments: [
        createConversationFragment({
          id: 'c1',
          events: 5,
          source: 'second-capture',
        }),
      ],
      generationId: archive.generation.generationId,
      createdAt: '2026-09-01T09:00:00.000Z',
    }),
  })

  const opened = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  const record = opened.state.conversation('c1')
  assert.ok(record)
  assert.equal(opened.state.counts().fragments, 2)
  assert.equal(record.events.length, 5)
  assert.equal(record.provenance.relativePath, 'c1.jsonl,second-capture.jsonl')
  opened.state.close()
})

void test('state built for another generation is thrown away, not carried across', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  const before = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  before.state.close()

  // What an erasure leaves behind: the same conversation ids, different bytes,
  // and a cache that would otherwise keep answering for the removed fragments.
  const after = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: { ...archive.generation, generationId: 'g-after-erasure' },
    segmentsDirectory: archive.segments,
  })
  assert.equal(after.rebuilt, true)
  assert.equal(after.state.meta('generationId'), 'g-after-erasure')
  after.state.close()
})

void test('pending deliveries name only what changed, and clear once delivered', async (context) => {
  const archive = await seedConversationSegmentArchive(context)
  const opened = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  opened.state.markPending(['c1'])
  assert.deepEqual(opened.state.pendingDeliveries(), ['c1'])
  opened.state.clearPendingDeliveries(['c1'])
  assert.deepEqual(opened.state.pendingDeliveries(), [])
  opened.state.close()
})

void test('a fragment already published is recognized by its hash alone', async (context) => {
  const fragment = createConversationFragment({ id: 'c1', events: 3 })
  const archive = await seedConversationSegmentArchive(context, [fragment])
  const opened = await openConversationArchiveState({
    statePath: archive.statePath,
    generation: archive.generation,
    segmentsDirectory: archive.segments,
  })
  assert.equal(
    opened.state.hasFragment(hashConversationFragment(fragment)),
    true,
  )
  assert.equal(opened.state.hasFragment('0'.repeat(64)), false)
  opened.state.close()
})
