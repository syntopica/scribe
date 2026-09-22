import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { CONVERSATION_BASE_GENERATION_ID } from './constants/CONVERSATION_BASE_GENERATION_ID'
import { createConversationRecord } from './fixtures/createConversationRecord'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { hashText } from './hashText'
import { initializeConversationArchiveGeneration } from './initializeConversationArchiveGeneration'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import { serializeConversationSegment } from './serializeConversationSegment'

void test('a segment is named by its own bytes and published only once', async (context) => {
  const directory = join(
    await createConversationScratchDirectory(context),
    'segments',
  )
  const text = createConversationSegment([createConversationRecord()])

  const first = await publishConversationSegment({
    segmentsDirectory: directory,
    text,
  })
  assert.equal(first.published, true)
  assert.equal(first.sha256, hashText(text))
  assert.equal(await fs.readFile(first.path, 'utf8'), text)

  const second = await publishConversationSegment({
    segmentsDirectory: directory,
    text,
  })
  assert.equal(second.published, false)
  assert.equal(second.path, first.path)
  assert.deepEqual(await listConversationArchiveSegments(directory), [
    first.sha256,
  ])
})

void test('publication refuses bytes that are not a readable segment', async (context) => {
  const directory = join(
    await createConversationScratchDirectory(context),
    'segments',
  )
  const text = createConversationSegment([createConversationRecord()])

  await assert.rejects(
    publishConversationSegment({
      segmentsDirectory: directory,
      text: text.replace('"entryCount":1', '"entryCount":2'),
    }),
  )
  assert.deepEqual(await listConversationArchiveSegments(directory), [])
})

void test('leftovers from an interrupted write are not segments', async (context) => {
  const directory = join(
    await createConversationScratchDirectory(context),
    'segments',
  )
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(join(directory, '.tmp-1-abcdef'), 'half a segment')
  await fs.writeFile(join(directory, 's_not-a-hash.jsonl'), 'nonsense')

  assert.deepEqual(await listConversationArchiveSegments(directory), [])
})

void test('a generation is named after the base segments it seals', async (context) => {
  const root = await createConversationScratchDirectory(context)
  const base = createConversationSegment(
    [createConversationRecord()],
    CONVERSATION_BASE_GENERATION_ID,
  )
  const sealed = await initializeConversationArchiveGeneration({
    root,
    baseSegments: [base],
    createdAt: '2026-08-31T23:00:00.000Z',
  })

  const read = await readConversationArchiveGeneration(root)
  assert.equal(read.generation.generationId, sealed.generationId)
  assert.deepEqual(read.generation.baseSegmentSha256, [hashText(base)])

  // The same corpus sealed again on another host must land on the same id, or
  // two installations holding identical bytes would refuse to sync.
  const elsewhere = await createConversationScratchDirectory(context)
  const twin = await initializeConversationArchiveGeneration({
    root: elsewhere,
    baseSegments: [base],
    createdAt: '2026-09-01T09:00:00.000Z',
  })
  assert.equal(twin.generationId, sealed.generationId)
})

void test('a segment from another generation is refused, not unioned', async (context) => {
  const root = await createConversationScratchDirectory(context)
  const sealed = await initializeConversationArchiveGeneration({
    root,
    baseSegments: [
      createConversationSegment(
        [createConversationRecord()],
        CONVERSATION_BASE_GENERATION_ID,
      ),
    ],
    createdAt: '2026-08-31T23:00:00.000Z',
  })
  const { generation, segments } = await readConversationArchiveGeneration(root)

  const mine = await publishConversationSegment({
    segmentsDirectory: segments,
    text: createConversationSegment(
      [createConversationRecord()],
      sealed.generationId,
    ),
  })
  const stale = await publishConversationSegment({
    segmentsDirectory: segments,
    text: serializeConversationSegment({
      fragments: [createConversationRecord()],
      generationId: 'g-erased-yesterday',
      createdAt: '2026-08-30T10:00:00.000Z',
    }),
  })

  await assert.doesNotReject(
    readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256: mine.sha256,
      generation,
    }),
  )
  await assert.rejects(
    readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256: stale.sha256,
      generation,
    }),
    /belongs to generation g-erased-yesterday/,
  )
})

void test('a base segment the generation does not name is refused', async (context) => {
  const root = await createConversationScratchDirectory(context)
  await initializeConversationArchiveGeneration({
    root,
    baseSegments: [
      createConversationSegment(
        [createConversationRecord()],
        CONVERSATION_BASE_GENERATION_ID,
      ),
    ],
    createdAt: '2026-08-31T23:00:00.000Z',
  })
  const { generation, segments } = await readConversationArchiveGeneration(root)

  const smuggled = await publishConversationSegment({
    segmentsDirectory: segments,
    text: serializeConversationSegment({
      fragments: [createConversationRecord()],
      generationId: CONVERSATION_BASE_GENERATION_ID,
      createdAt: '2026-08-30T10:00:00.000Z',
    }),
  })
  await assert.rejects(
    readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256: smuggled.sha256,
      generation,
    }),
    /is not named by this generation/,
  )
})
