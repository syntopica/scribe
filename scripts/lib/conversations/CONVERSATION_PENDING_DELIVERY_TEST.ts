import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { acknowledgeConversationSlice } from './acknowledgeConversationSlice'
import { exportMaterializedConversationArchive } from './exportMaterializedConversationArchive'
import { exportPendingConversationSlice } from './exportPendingConversationSlice'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { inventoryConversationSegmentArchive } from './inventoryConversationSegmentArchive'
import { publishConversationSegment } from './publishConversationSegment'
import { streamConversationExport } from './streamConversationExport'
import type { ConversationRecord } from './types/ConversationRecord'

void test('a slice carries what is pending, and its acknowledgement clears it', async (context) => {
  const archive = await seedConversationSegmentArchive(context, [
    createConversationFragment({ id: 'a', events: 1 }),
    createConversationFragment({ id: 'b', events: 2 }),
  ])
  const store = { root: archive.root, statePath: archive.statePath }
  const slice = join(archive.root, '..', `${String(process.pid)}-slice.jsonl`)
  context.after(async () => fs.rm(slice, { force: true }))

  const inventory = await inventoryConversationSegmentArchive(store)
  assert.equal(inventory.generationId, archive.generation.generationId)
  assert.equal(inventory.pendingDeliveries, 2)

  const exported = await exportPendingConversationSlice({
    ...store,
    output: slice,
    now: new Date('2026-10-11T12:00:00.000Z'),
  })
  assert.deepEqual(exported.conversationIds, ['a', 'b'])
  const records: ConversationRecord[] = []
  const streamed = await streamConversationExport(slice, (record) =>
    records.push(record),
  )
  assert.deepEqual(streamed.errors, [])
  assert.deepEqual(
    records.map((record) => record.id),
    ['a', 'b'],
  )

  const acked = await acknowledgeConversationSlice({ ...store, slice })
  assert.deepEqual(acked.acknowledged, ['a', 'b'])
  assert.deepEqual(acked.stillPending, [])
  assert.equal(
    (await inventoryConversationSegmentArchive(store)).pendingDeliveries,
    0,
  )
})

void test('a conversation that changed after its slice was written stays pending', async (context) => {
  const archive = await seedConversationSegmentArchive(context, [
    createConversationFragment({ id: 'a', events: 1 }),
  ])
  const store = { root: archive.root, statePath: archive.statePath }
  const slice = join(archive.root, '..', `${String(process.pid)}-stale.jsonl`)
  context.after(async () => fs.rm(slice, { force: true }))
  await exportPendingConversationSlice({
    ...store,
    output: slice,
    now: new Date('2026-10-11T12:00:00.000Z'),
  })

  // A sync delivers a longer revision of `a` before Atrium acknowledges.
  await publishConversationSegment({
    segmentsDirectory: archive.segments,
    text: createConversationSegment(
      [createConversationFragment({ id: 'a', events: 3 })],
      archive.generation.generationId,
    ),
  })

  const acked = await acknowledgeConversationSlice({ ...store, slice })
  assert.deepEqual(acked.acknowledged, [])
  assert.deepEqual(acked.stale, ['a'])
  assert.deepEqual(acked.stillPending, ['a'])
})

void test('the materialized export holds every live conversation and clears nothing', async (context) => {
  const archive = await seedConversationSegmentArchive(context, [
    createConversationFragment({ id: 'a', events: 1 }),
    createConversationFragment({ id: 'b', events: 2 }),
    createConversationFragment({ id: 'b', events: 4, source: 'longer' }),
  ])
  const store = { root: archive.root, statePath: archive.statePath }
  const output = join(archive.root, '..', `${String(process.pid)}-full.jsonl`)
  context.after(async () => fs.rm(output, { force: true }))

  const exported = await exportMaterializedConversationArchive({
    ...store,
    output,
    now: new Date('2026-10-11T12:00:00.000Z'),
  })
  assert.equal(exported.generationId, archive.generation.generationId)
  assert.equal(exported.manifest.records, 2)
  const records: ConversationRecord[] = []
  const streamed = await streamConversationExport(output, (record) =>
    records.push(record),
  )
  assert.deepEqual(streamed.errors, [])
  // Both fragments of `b` are reduced into one record carrying the union.
  assert.equal(records.find((record) => record.id === 'b')?.events.length, 4)
  assert.equal(
    (await inventoryConversationSegmentArchive(store)).pendingDeliveries,
    2,
  )
})
