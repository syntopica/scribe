import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

void test('the verifier keeps its throwaway state in the scratch directory it is given', async (context) => {
  const { root } = await seedConversationSegmentArchive(context)
  const scratch = await createConversationScratchDirectory(context, 'verify-')
  const verified = await verifyConversationSegmentArchive({
    root,
    scratchDirectory: scratch,
  })
  assert.equal(verified.ok, true)
  assert.deepEqual(await fs.readdir(scratch), [])

  // A scratch directory it cannot use fails the run, so it is the one used.
  await assert.rejects(
    verifyConversationSegmentArchive({
      root,
      scratchDirectory: join(scratch, 'missing'),
    }),
  )
})
