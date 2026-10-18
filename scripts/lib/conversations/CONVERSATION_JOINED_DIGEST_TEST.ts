import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createJoinedTextDigest } from './createJoinedTextDigest'
import { digestConversationArchiveState } from './digestConversationArchiveState'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { hashText } from './hashText'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

void test('the streamed digest equals hashing the joined items', () => {
  for (const items of [[], [''], ['a'], ['a', 'b'], ['', 'x', '']]) {
    const digest = createJoinedTextDigest()
    for (const item of items) digest.add(item)
    assert.equal(digest.digest(), hashText(items.join('\n')))
  }
})

void test('the state digests equal the verifier digests for ids that sort differently in SQL', async (context) => {
  const { root, statePath } = await seedConversationSegmentArchive(context, [
    createConversationFragment({ id: 'B', events: 2 }),
    createConversationFragment({ id: 'a', events: 3 }),
  ])
  const verified = await verifyConversationSegmentArchive({ root })
  const { digests } = await digestConversationArchiveState({ root, statePath })
  assert.equal(verified.ok, true)
  assert.deepEqual(digests, {
    generationId: verified.generationId,
    ...verified.digests,
  })
})
