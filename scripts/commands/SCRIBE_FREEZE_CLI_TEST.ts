import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { conversationPathExists } from '../lib/conversations/conversationPathExists'
import { createConversationScratchDirectory } from '../lib/conversations/fixtures/createConversationScratchDirectory'
import { seedConversationSegmentArchive } from '../lib/conversations/fixtures/seedConversationSegmentArchive'
import { snapshotConversationTree } from '../lib/conversations/fixtures/snapshotConversationTree'
import { stageConversationGeneration } from '../lib/conversations/fixtures/stageConversationGeneration'
import { resolveConversationSegmentPaths } from '../lib/conversations/resolveConversationSegmentPaths'
import { runScribeWithState } from './fixtures/runScribeWithState'
import { runScribeWithStateConcurrently } from './fixtures/runScribeWithStateConcurrently'

void test('every writer refuses with 75 while frozen, readers run, unfreezing restores writers', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const id = origin.generation.generationId
  const scratch = await createConversationScratchDirectory(context, 'frozen-')
  const state = join(scratch, 'state')
  const home = join(scratch, 'home')
  await fs.mkdir(state)
  await fs.mkdir(home)
  const sentinel = join(state, 'migration.freeze')
  await fs.writeFile(sentinel, '')
  const staging = await stageConversationGeneration(context, origin.root, id)
  const peer = join(scratch, 'peer')
  const v1 = join(scratch, 'archive.jsonl')
  const outputs = [
    join(scratch, 'capture-state.sqlite3'),
    join(scratch, 'export.jsonl'),
    v1,
    join(scratch, 'migrated'),
    peer,
    join(scratch, 'drill-work'),
  ]
  const writers = [
    [
      'capture',
      '--root',
      origin.root,
      '--home',
      home,
      '--state',
      join(scratch, 'capture-state.sqlite3'),
    ],
    ['export', '--output', join(scratch, 'export.jsonl'), '--home', home],
    [
      'import',
      '--input',
      join(scratch, 'slice.jsonl'),
      '--archive',
      v1,
      '--apply',
    ],
    ['rewrite', '--archive', v1, '--home', '/Users/someone', '--apply'],
    ['migrate-segments', '--archive', v1, '--root', join(scratch, 'migrated')],
    [
      'segments-receive',
      '--root',
      origin.root,
      '--from',
      staging,
      '--expect-generation',
      id,
    ],
    [
      'segments-seed-generation',
      '--root',
      peer,
      '--from',
      staging,
      '--generation',
      id,
    ],
    [
      'erase',
      'apply',
      '--root',
      origin.root,
      '--plan',
      join(scratch, 'plan.json'),
    ],
    ['erase', 'activate', '--root', origin.root, '--generation', id],
    [
      'recovery-drill',
      '--root',
      origin.root,
      '--work',
      join(scratch, 'drill-work'),
    ],
  ]
  const before = await snapshotConversationTree(origin.root)
  for (const args of writers) {
    const run = runScribeWithState(state, ...args)
    assert.equal(run.status, 75, `${args.join(' ')}\n${run.stderr}`)
    assert.match(run.stderr, /^frozen: .*migration\.freeze exists/)
    assert.equal(run.stdout, '')
  }
  assert.deepEqual(await snapshotConversationTree(origin.root), before)
  for (const output of outputs)
    assert.equal(await conversationPathExists(output), false, output)

  const readerState = join(scratch, 'reader-state.sqlite3')
  const readers = [
    ['segments-inventory', '--root', origin.root, '--state', readerState],
    ['verify-segments', '--root', origin.root],
    [
      'export-materialized',
      '--root',
      origin.root,
      '--state',
      readerState,
      '--output',
      join(scratch, 'materialized.jsonl'),
    ],
  ]
  for (const args of readers) {
    const run = runScribeWithState(state, ...args)
    assert.equal(run.status, 0, `${args.join(' ')}\n${run.stderr}`)
  }

  // A cutover step inside the freeze opts in explicitly; capture cannot.
  const seeded = runScribeWithState(
    state,
    'segments-seed-generation',
    '--root',
    peer,
    '--from',
    staging,
    '--generation',
    id,
    '--migration-frozen',
  )
  assert.equal(seeded.status, 0, seeded.stderr)
  const forcedCapture = runScribeWithState(
    state,
    'capture',
    '--root',
    origin.root,
    '--home',
    home,
    '--state',
    join(scratch, 'capture-state.sqlite3'),
    '--migration-frozen',
  )
  assert.equal(forcedCapture.status, 75, forcedCapture.stderr)

  await fs.rm(sentinel)
  const activated = runScribeWithState(
    state,
    'erase',
    'activate',
    '--root',
    peer,
    '--generation',
    id,
  )
  assert.equal(activated.status, 0, activated.stderr)
  const captured = runScribeWithState(
    state,
    'capture',
    '--root',
    origin.root,
    '--home',
    home,
    '--state',
    join(scratch, 'capture-state.sqlite3'),
  )
  assert.equal(captured.status, 0, captured.stderr)
  assert.equal(
    await conversationPathExists(join(scratch, 'capture-state.sqlite3')),
    true,
  )
})

void test('capture --init that meets a freeze while waiting for the lock selects nothing', async (context) => {
  const scratch = await createConversationScratchDirectory(context, 'init-')
  const state = join(scratch, 'state')
  const home = join(scratch, 'home')
  const root = join(scratch, 'root')
  await fs.mkdir(state)
  await fs.mkdir(home)
  await fs.mkdir(root)
  const lock = join(root, 'archive.write-lock')
  // Held by this live process, so capture passes its first check and queues.
  await fs.writeFile(lock, `${String(process.pid)}\n`)
  const capture = runScribeWithStateConcurrently(
    state,
    'capture',
    '--root',
    root,
    '--home',
    home,
    '--state',
    join(scratch, 'capture-state.sqlite3'),
    '--init',
  )
  await delay(1500)
  await fs.writeFile(join(state, 'migration.freeze'), '')
  await fs.rm(lock)
  const run = await capture
  assert.equal(run.status, 75, run.stderr)
  assert.match(run.stderr, /^frozen: /)
  assert.equal(
    await conversationPathExists(
      resolveConversationSegmentPaths(root).reference,
    ),
    false,
  )
  assert.equal(await conversationPathExists(lock), false)
})
