import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createConversationScratchDirectory } from '../lib/conversations/fixtures/createConversationScratchDirectory'
import { seedErasureArchiveWithCapture } from '../lib/conversations/fixtures/seedErasureArchiveWithCapture'
import { snapshotConversationTree } from '../lib/conversations/fixtures/snapshotConversationTree'
import { listConversationArchiveSegments } from '../lib/conversations/listConversationArchiveSegments'
import { readConversationArchiveGeneration } from '../lib/conversations/readConversationArchiveGeneration'
import type { ConversationRecoveryDrillReport } from '../lib/conversations/types/ConversationRecoveryDrillReport'
import { runScribe } from './fixtures/runScribe'
import { runScribeWithEnvironment } from './fixtures/runScribeWithEnvironment'

void test('recovery-drill passes every step on a seeded disposable copy', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  const scratch = await createConversationScratchDirectory(context, 'drill-')
  const work = join(scratch, 'work')
  const run = runScribe(
    'recovery-drill',
    '--root',
    root,
    '--work',
    work,
    '--exercise-erasure',
    '--exercise-stale-peer',
  )
  assert.equal(run.status, 0, run.stdout + run.stderr)
  const { steps } = JSON.parse(run.stdout) as ConversationRecoveryDrillReport
  assert.deepEqual(
    steps.map((step) => [step.step, step.ok]),
    [
      ['baseline', true],
      ['rebuild', true],
      ['erasure', true],
      ['stale-peer', true],
      ['rollback', true],
    ],
  )
  assert.deepEqual(steps[4]?.details['digests'], steps[0]?.details['digests'])
  // The verifier's throwaway state lived in --work and was removed there.
  assert.deepEqual(await fs.readdir(join(work, 'verify-state')), [])
  assert.equal(
    (await readConversationArchiveGeneration(root)).generation.generationId,
    generation.generationId,
  )
})

void test('recovery-drill refuses missing flags and a stale peer without an erasure', () => {
  for (const args of [
    ['--work', '/nonexistent/work'],
    ['--root', '/nonexistent/root'],
    [
      '--root',
      '/nonexistent/root',
      '--work',
      '/nonexistent/work',
      '--exercise-stale-peer',
    ],
  ]) {
    const run = runScribe('recovery-drill', ...args)
    assert.equal(run.status, 2, args.join(' '))
  }
})

void test('recovery-drill refuses live data and overlapping work and root', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const data = await createConversationScratchDirectory(context, 'data-')
  const live = join(data, 'conversations', 'segments')
  await fs.cp(root, live, { recursive: true })
  const scratch = await createConversationScratchDirectory(context, 'drill-')
  const underData = runScribeWithEnvironment(
    { SYNTOPICA_DATA: data },
    'recovery-drill',
    '--root',
    live,
    '--work',
    join(scratch, 'work'),
  )
  assert.equal(underData.status, 2)
  assert.match(underData.stderr, /overlaps live conversation data/)
  for (const [drillRoot, work] of [
    [root, join(root, 'work')],
    [join(scratch, 'copy', 'inner'), join(scratch, 'copy')],
  ] as const) {
    const run = runScribe('recovery-drill', '--root', drillRoot, '--work', work)
    assert.equal(run.status, 2, `${drillRoot} ${work}`)
    assert.match(run.stderr, /neither inside the other/)
  }
  assert.equal(
    await fs.access(join(root, 'work')).then(
      () => true,
      () => false,
    ),
    false,
  )
})

void test('recovery-drill exits non-zero and names the step a corrupt segment fails', async (context) => {
  const { root, segments } = await seedErasureArchiveWithCapture(context)
  const [first] = await listConversationArchiveSegments(segments)
  assert.ok(first !== undefined)
  await fs.appendFile(join(segments, `s_${first}.jsonl`), 'corrupt\n')
  const scratch = await createConversationScratchDirectory(context, 'drill-')
  const run = runScribe(
    'recovery-drill',
    '--root',
    root,
    '--work',
    join(scratch, 'work'),
    '--exercise-erasure',
  )
  assert.equal(run.status, 1, run.stderr)
  const { steps } = JSON.parse(run.stdout) as ConversationRecoveryDrillReport
  assert.deepEqual(
    steps.map((step) => [step.step, step.ok]),
    [['baseline', false]],
  )
  assert.match(steps[0]?.problems.join('\n') ?? '', new RegExp(first))
})

void test('recovery-drill refuses a root whose generations link into live data', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const data = await createConversationScratchDirectory(context, 'data-')
  const live = join(data, 'conversations', 'generations')
  await fs.cp(join(root, 'generations'), live, { recursive: true })
  await fs.rm(join(root, 'generations'), { recursive: true })
  await fs.symlink(live, join(root, 'generations'))
  const before = await snapshotConversationTree(live)
  const scratch = await createConversationScratchDirectory(context, 'drill-')
  const run = runScribeWithEnvironment(
    { SYNTOPICA_DATA: data },
    'recovery-drill',
    '--root',
    root,
    '--work',
    join(scratch, 'work'),
    '--exercise-erasure',
  )
  assert.equal(run.status, 2, run.stdout + run.stderr)
  assert.match(run.stderr, /symbolic link at .*generations/)
  assert.deepEqual(await snapshotConversationTree(live), before)
})

void test('recovery-drill protects $HOME/p/wiki without SYNTOPICA_DATA and refuses an empty HOME', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const home = await createConversationScratchDirectory(context, 'home-')
  const wikiCopy = join(home, 'p', 'wiki', 'drill-copy')
  await fs.cp(root, wikiCopy, { recursive: true })
  const scratch = await createConversationScratchDirectory(context, 'drill-')
  const underWiki = runScribeWithEnvironment(
    { SYNTOPICA_DATA: undefined, HOME: home },
    'recovery-drill',
    '--root',
    wikiCopy,
    '--work',
    join(scratch, 'work'),
  )
  assert.equal(underWiki.status, 2, underWiki.stdout + underWiki.stderr)
  assert.match(underWiki.stderr, /overlaps live conversation data at .*p\/wiki/)

  const noHome = runScribeWithEnvironment(
    { HOME: '' },
    'recovery-drill',
    '--root',
    root,
    '--work',
    join(scratch, 'work'),
  )
  assert.equal(noHome.status, 2, noHome.stdout + noHome.stderr)
  assert.match(noHome.stderr, /HOME is unset or empty/)
})
