import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { readStoredConversationRecords as stored } from './fixtures/readStoredConversationRecords'
import type { ConversationRecord } from './types/ConversationRecord'

void test('a fragment the store has already absorbed is a duplicate, not an update', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-store-merge-',
  )
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  try {
    const shorter = createConversationFragment({ id: 'c', events: 2 })
    const longer = createConversationFragment({ id: 'c', events: 3 })
    assert.equal(store.mergeFragment(shorter), 'added')
    assert.equal(store.mergeFragment(longer), 'updated')
    assert.equal(stored(store)[0]?.provenance.relativePath, 'c.jsonl')

    // Before: the merged hash is a hash of hashes, so the same fragment never
    // matched it again and each pass reported an update and appended its
    // path once more. Every import between two archives did this to every
    // shared conversation, forever.
    const before = stored(store)[0]
    assert.equal(store.mergeFragment(shorter), 'duplicate')
    assert.equal(store.mergeFragment(longer), 'duplicate')
    assert.deepEqual(stored(store)[0], before)

    // The same events from a new place are worth recording once.
    const recovered: ConversationRecord = {
      ...shorter,
      provenance: {
        ...shorter.provenance,
        contentSha256: 'recovered-c-2',
        relativePath: 'recovered/c.jsonl',
      },
    }
    assert.equal(store.mergeFragment(recovered), 'updated')
    assert.equal(
      stored(store)[0]?.provenance.relativePath,
      'c.jsonl,recovered/c.jsonl',
    )
    assert.equal(store.mergeFragment(recovered), 'duplicate')
    assert.equal(store.count(), 1)
  } finally {
    store.close()
  }
})

void test('merging a record that already carries a joined path does not repeat entries', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-store-merge-joined-',
  )
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  try {
    const merged: ConversationRecord = {
      ...createConversationFragment({ id: 'c', events: 3 }),
      provenance: {
        contentSha256: 'merged-a-b',
        relativePath: 'a.jsonl,b.jsonl',
        redactions: 0,
      },
      startedAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:02:00.000Z',
    }
    const again = createConversationFragment({
      id: 'c',
      events: 2,
      source: 'a',
    })
    assert.equal(store.mergeFragment(merged), 'added')
    assert.equal(store.mergeFragment(again), 'duplicate')
    assert.equal(stored(store)[0]?.provenance.relativePath, 'a.jsonl,b.jsonl')
  } finally {
    store.close()
  }
})
