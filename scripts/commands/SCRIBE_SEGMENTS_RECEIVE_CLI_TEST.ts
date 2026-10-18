import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createConversationFragment } from '../lib/conversations/fixtures/createConversationFragment'
import { createConversationScratchDirectory } from '../lib/conversations/fixtures/createConversationScratchDirectory'
import { createConversationSegment } from '../lib/conversations/fixtures/createConversationSegment'
import { seedConversationSegmentArchive } from '../lib/conversations/fixtures/seedConversationSegmentArchive'
import { stageConversationGeneration } from '../lib/conversations/fixtures/stageConversationGeneration'
import { hashText } from '../lib/conversations/hashText'
import { readConversationArchiveGeneration } from '../lib/conversations/readConversationArchiveGeneration'
import { runScribe } from './fixtures/runScribe'

void test('segments-receive and segments-seed-generation require their flags', () => {
  for (const args of [
    ['segments-receive', '--from', '/x', '--expect-generation', 'a'.repeat(64)],
    ['segments-receive', '--root', '/x', '--expect-generation', 'a'.repeat(64)],
    ['segments-receive', '--root', '/x', '--from', '/y'],
    ['segments-seed-generation', '--root', '/nonexistent', '--from', '/x'],
    [
      'segments-receive',
      '--root',
      '/x',
      '--from',
      '/y',
      '--expect-generation',
      'g',
    ],
  ]) {
    const run = runScribe(...args)
    assert.equal(run.status, 2, args.join(' '))
  }
})

void test('scribe seeds, activates and receives on disposable roots', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const id = origin.generation.generationId
  const root = await createConversationScratchDirectory(context, 'peer-')

  const early = runScribe(
    'segments-receive',
    '--root',
    root,
    '--from',
    root,
    '--expect-generation',
    id,
  )
  assert.equal(early.status, 2)
  assert.match(early.stderr, /no active generation/)

  const seeded = runScribe(
    'segments-seed-generation',
    '--root',
    root,
    '--from',
    await stageConversationGeneration(context, origin.root, id),
    '--generation',
    id,
  )
  assert.equal(seeded.status, 0, seeded.stderr)
  assert.partialDeepStrictEqual(JSON.parse(seeded.stdout) as unknown, {
    generationId: id,
    created: true,
    activated: false,
  })
  const activated = runScribe(
    'erase',
    'activate',
    '--root',
    root,
    '--generation',
    id,
  )
  assert.equal(activated.status, 0, activated.stderr)
  assert.equal(
    (await readConversationArchiveGeneration(root)).generation.generationId,
    id,
  )

  const staging = await createConversationScratchDirectory(context, 'staged-')
  const delta = createConversationSegment(
    [createConversationFragment({ id: 'delta', events: 1 })],
    id,
  )
  await fs.writeFile(join(staging, `s_${hashText(delta)}.jsonl`), delta)
  const tamperedName = `s_${'0'.repeat(64)}.jsonl`
  await fs.writeFile(join(staging, tamperedName), delta)

  const refusedWhole = runScribe(
    'segments-receive',
    '--root',
    root,
    '--from',
    staging,
    '--expect-generation',
    'a'.repeat(64),
  )
  assert.equal(refusedWhole.status, 1)
  assert.match(refusedWhole.stderr, /seed the generation/)
  assert.equal((await fs.readdir(staging)).length, 2)

  const received = runScribe(
    'segments-receive',
    '--root',
    root,
    '--from',
    staging,
    '--expect-generation',
    id,
  )
  assert.equal(received.status, 1)
  assert.partialDeepStrictEqual(JSON.parse(received.stdout) as unknown, {
    generationId: id,
    received: [hashText(delta)],
    alreadyPresent: [],
    refused: [{ name: tamperedName }],
  })
  assert.deepEqual(await fs.readdir(staging), [tamperedName])

  await fs.rm(join(staging, tamperedName))
  await fs.writeFile(join(staging, `s_${hashText(delta)}.jsonl`), delta)
  const again = runScribe(
    'segments-receive',
    '--root',
    root,
    '--from',
    staging,
    '--expect-generation',
    id,
  )
  assert.equal(again.status, 0, again.stderr)
  assert.partialDeepStrictEqual(JSON.parse(again.stdout) as unknown, {
    received: [],
    alreadyPresent: [hashText(delta)],
    refused: [],
  })
})

void test('erase activate waits for the archive write lock', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const before = await fs.readFile(
    join(origin.root, 'current-generation.json'),
    'utf8',
  )
  // Held by this live test process, so it is not abandoned.
  await fs.writeFile(
    join(origin.root, 'archive.write-lock'),
    `${String(process.pid)}\n`,
  )
  const previous = process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS']
  process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS'] = '500'
  try {
    const run = runScribe(
      'erase',
      'activate',
      '--root',
      origin.root,
      '--generation',
      origin.generation.generationId,
    )
    assert.notEqual(run.status, 0)
    assert.match(run.stderr, /timed out waiting for/)
  } finally {
    if (previous === undefined)
      delete process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS']
    else process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS'] = previous
  }
  assert.equal(
    await fs.readFile(join(origin.root, 'current-generation.json'), 'utf8'),
    before,
  )
})
