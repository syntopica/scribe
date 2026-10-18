import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createConversationFragment } from '../lib/conversations/fixtures/createConversationFragment'
import { createConversationScratchDirectory } from '../lib/conversations/fixtures/createConversationScratchDirectory'
import { createConversationSegment } from '../lib/conversations/fixtures/createConversationSegment'
import { seedErasureArchiveWithCapture } from '../lib/conversations/fixtures/seedErasureArchiveWithCapture'
import { publishConversationSegment } from '../lib/conversations/publishConversationSegment'
import { readConversationArchiveGeneration } from '../lib/conversations/readConversationArchiveGeneration'
import { readConversationArchiveGenerationManifest } from '../lib/conversations/readConversationArchiveGenerationManifest'
import { readConversationErasurePlanFile } from '../lib/conversations/readConversationErasurePlanFile'
import { runScribeErase } from './fixtures/runScribeErase'
import { runScribeEraseConcurrently } from './fixtures/runScribeEraseConcurrently'

void test('scribe erase plans, applies, verifies and activates on a disposable root', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')
  const idsFile = join(work, 'ids.txt')
  await fs.writeFile(idsFile, 'missing-id\n\n')

  const planned = runScribeErase(
    'plan',
    '--root',
    root,
    '--conversation',
    'a',
    '--ids-file',
    idsFile,
    '--output',
    planFile,
  )
  assert.equal(planned.status, 0, planned.stderr)
  assert.partialDeepStrictEqual(JSON.parse(planned.stdout) as unknown, {
    conversationIds: ['a'],
    unmatchedConversationIds: ['missing-id'],
    fragmentsRemoved: 2,
  })
  const plan = await readConversationErasurePlanFile(planFile)
  assert.equal(plan.fromGenerationId, generation.generationId)
  assert.equal(plan.toGenerationId, undefined)

  const applied = runScribeErase('apply', '--root', root, '--plan', planFile)
  assert.equal(applied.status, 0, applied.stderr)
  const { toGenerationId: generationId } =
    await readConversationErasurePlanFile(planFile)
  assert.ok(generationId !== undefined)
  assert.partialDeepStrictEqual(JSON.parse(applied.stdout) as unknown, {
    generationId,
  })
  // apply selects nothing
  const unchanged = await readConversationArchiveGeneration(root)
  assert.equal(unchanged.generation.generationId, generation.generationId)
  assert.notEqual(
    runScribeErase('apply', '--root', root, '--plan', planFile).status,
    0,
  )

  const verified = runScribeErase('verify', '--root', root, '--plan', planFile)
  assert.equal(verified.status, 0, verified.stdout + verified.stderr)
  assert.partialDeepStrictEqual(JSON.parse(verified.stdout) as unknown, {
    ok: true,
  })

  const activated = runScribeErase(
    'activate',
    '--root',
    root,
    '--generation',
    generationId,
  )
  assert.equal(activated.status, 0, activated.stderr)
  const current = await readConversationArchiveGeneration(root)
  assert.equal(current.generation.generationId, generationId)
})

void test('scribe erase refuses a missing root, an existing plan file and an unnamed generation', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')

  for (const args of [
    ['plan', '--conversation', 'a', '--output', planFile],
    ['apply', '--plan', planFile],
    ['verify', '--plan', planFile],
    ['activate', '--generation', 'f'.repeat(64)],
  ]) {
    const run = runScribeErase(...args)
    assert.equal(run.status, 2, args.join(' '))
    assert.match(run.stderr, /--root/)
  }
  await assert.rejects(fs.access(planFile))

  assert.equal(
    runScribeErase(
      'plan',
      '--root',
      root,
      '--conversation',
      'a',
      '--output',
      planFile,
    ).status,
    0,
  )
  const before = await fs.readFile(planFile, 'utf8')
  const again = runScribeErase(
    'plan',
    '--root',
    root,
    '--conversation',
    'b',
    '--output',
    planFile,
  )
  assert.notEqual(again.status, 0)
  assert.match(again.stderr, /already exists/)
  assert.equal(await fs.readFile(planFile, 'utf8'), before)

  const redaction = runScribeErase(
    'plan',
    '--root',
    root,
    '--conversation',
    'a',
    '--reason',
    'redaction',
    '--output',
    join(work, 'r.json'),
  )
  assert.equal(redaction.status, 2)
  assert.match(redaction.stderr, /redaction is not supported/)

  assert.equal(runScribeErase('activate', '--root', root).status, 2)
  assert.equal(
    runScribeErase('activate', '--root', root, '--generation', 'latest').status,
    2,
  )
  assert.equal(
    runScribeErase('activate', '--root', root, '--generation', '../x').status,
    2,
  )
})

void test('scribe erase verify exits non-zero on a tampered generation', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')
  assert.equal(
    runScribeErase(
      'plan',
      '--root',
      root,
      '--conversation',
      'a',
      '--output',
      planFile,
    ).status,
    0,
  )
  assert.equal(
    runScribeErase('apply', '--root', root, '--plan', planFile).status,
    0,
  )
  const { toGenerationId } = await readConversationErasurePlanFile(planFile)
  assert.ok(toGenerationId !== undefined)
  const sealed = await readConversationArchiveGenerationManifest(
    root,
    toGenerationId,
  )
  const [first] = sealed.generation.baseSegmentSha256
  assert.ok(first !== undefined)
  await fs.rm(join(sealed.segments, `s_${first}.jsonl`))

  const verified = runScribeErase('verify', '--root', root, '--plan', planFile)
  assert.equal(verified.status, 1)
  assert.partialDeepStrictEqual(JSON.parse(verified.stdout) as unknown, {
    ok: false,
  })
  assert.match(verified.stdout, /base segment [0-9a-f]{64} is missing/)
})

void test('two concurrent applies of one plan seal once and the loser is refused', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')
  assert.equal(
    runScribeErase(
      'plan',
      '--root',
      root,
      '--conversation',
      'a',
      '--output',
      planFile,
    ).status,
    0,
  )
  const runs = await Promise.all([
    runScribeEraseConcurrently('apply', '--root', root, '--plan', planFile),
    runScribeEraseConcurrently('apply', '--root', root, '--plan', planFile),
  ])
  const winners = runs.filter((run) => run.status === 0)
  assert.equal(winners.length, 1, JSON.stringify(runs))
  assert.match(
    runs.find((run) => run.status !== 0)?.stderr ?? '',
    /already applied/,
  )
  const { toGenerationId } = await readConversationErasurePlanFile(planFile)
  assert.ok(toGenerationId !== undefined)
  assert.partialDeepStrictEqual(
    JSON.parse(winners[0]?.stdout ?? '') as unknown,
    {
      generationId: toGenerationId,
    },
  )
})

void test('scribe erase verify refuses plans that are malformed or escape the root', async (context) => {
  const { root } = await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')
  assert.equal(
    runScribeErase(
      'plan',
      '--root',
      root,
      '--conversation',
      'a',
      '--output',
      planFile,
    ).status,
    0,
  )
  assert.equal(
    runScribeErase('apply', '--root', root, '--plan', planFile).status,
    0,
  )
  const applied = await readConversationErasurePlanFile(planFile)
  const [first] = applied.conversations
  assert.ok(first !== undefined)
  const tampered = join(work, 'tampered.json')

  for (const [overrides, refusal] of [
    [
      { fromGenerationId: '../../../outside' },
      /fromGenerationId is not a 64-character hex id/,
    ],
    [
      { toGenerationId: '../../../outside' },
      /toGenerationId is not a 64-character hex id/,
    ],
    [
      { segmentSetSha256: 'x' },
      /segmentSetSha256 is not a 64-character hex digest/,
    ],
    [
      {
        conversations: [],
        conversationIds: [],
        toGenerationId: applied.fromGenerationId,
      },
      /toGenerationId is the generation the plan erases from/,
    ],
    [
      { conversationIds: ['b'] },
      /conversationIds must be the sorted, unique ids/,
    ],
    [
      { conversations: [{ ...first, removedFragmentSha256: [] }] },
      /every conversation must remove at least one/,
    ],
  ] as const) {
    await fs.rm(tampered, { force: true })
    await fs.writeFile(tampered, JSON.stringify({ ...applied, ...overrides }))
    const run = runScribeErase('verify', '--root', root, '--plan', tampered)
    assert.notEqual(run.status, 0, JSON.stringify(overrides))
    assert.match(run.stderr, refusal)
    assert.equal(run.stdout, '')
  }

  await fs.rm(tampered, { force: true })
  await fs.writeFile(
    tampered,
    JSON.stringify({ ...applied, conversations: [], conversationIds: [] }),
  )
  const empty = runScribeErase('verify', '--root', root, '--plan', tampered)
  assert.equal(empty.status, 1)
  assert.match(empty.stderr, /removes nothing/)
})

void test('scribe erase verify fails when the old generation gained a segment after the plan', async (context) => {
  const { root, segments, generation } =
    await seedErasureArchiveWithCapture(context)
  const work = await createConversationScratchDirectory(context, 'erase-cli-')
  const planFile = join(work, 'erasure-plan.json')
  assert.equal(
    runScribeErase(
      'plan',
      '--root',
      root,
      '--conversation',
      'a',
      '--output',
      planFile,
    ).status,
    0,
  )
  assert.equal(
    runScribeErase('apply', '--root', root, '--plan', planFile).status,
    0,
  )
  await publishConversationSegment({
    segmentsDirectory: segments,
    text: createConversationSegment(
      [createConversationFragment({ id: 'late', events: 1 })],
      generation.generationId,
    ),
  })
  const verified = runScribeErase('verify', '--root', root, '--plan', planFile)
  assert.equal(verified.status, 1)
  assert.match(
    verified.stdout,
    /segment set is no longer the one the plan was computed from/,
  )
})
