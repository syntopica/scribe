import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { CONVERSATION_BASE_GENERATION_ID } from './constants/CONVERSATION_BASE_GENERATION_ID'
import { captureConversationDelta } from './fixtures/captureConversationDelta'
import { compareConversationNames as byName } from './fixtures/compareConversationNames'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { exchangeConversationSegments } from './fixtures/exchangeConversationSegments'
import { seedConversationInstallation } from './fixtures/seedConversationInstallation'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { stageConversationGeneration } from './fixtures/stageConversationGeneration'
import { stageMissingConversationSegments } from './fixtures/stageMissingConversationSegments'
import { hashText } from './hashText'
import { inventoryConversationSegmentArchive } from './inventoryConversationSegmentArchive'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { openConversationSegmentState } from './openConversationSegmentState'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { receiveConversationSegments } from './receiveConversationSegments'
import { sealConversationArchiveGeneration } from './sealConversationArchiveGeneration'
import { seedConversationArchiveGeneration } from './seedConversationArchiveGeneration'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

void test('four installations converge; a stale one only through a seeded generation', async (context) => {
  // A starts on G0; C takes G0 from it, then A moves to G1 (as an erasure would).
  const origin = await seedConversationSegmentArchive(context)
  const a = origin.root
  const g0 = origin.generation.generationId
  const c = await seedConversationInstallation(context, a, g0)
  await captureConversationDelta(c, 'stale-delta')
  const sealed = await sealConversationArchiveGeneration({
    root: a,
    baseSegments: [
      createConversationSegment(
        [
          createConversationFragment({ id: 'c1', events: 3 }),
          createConversationFragment({ id: 'c2', events: 1 }),
        ],
        CONVERSATION_BASE_GENERATION_ID,
      ),
    ],
    createdAt: '2026-10-18T00:00:00.000Z',
    parentGenerationId: g0,
  })
  const g1 = sealed.generationId
  await activateConversationArchiveGeneration({
    root: a,
    generationId: g1,
    updatedAt: '2026-10-18T00:00:00.000Z',
  })
  const b = await seedConversationInstallation(context, a, g1)
  const d = await seedConversationInstallation(context, a, g1)
  await captureConversationDelta(a, 'from-a')
  await captureConversationDelta(b, 'from-b')
  await captureConversationDelta(d, 'from-d')

  // B has delivered everything it holds so far; what arrives next is pending.
  const opened = await openConversationSegmentState({
    root: b,
    statePath: join(b, 'state.sqlite3'),
  })
  opened.state.clearPendingDeliveries(opened.state.pendingDeliveries())
  opened.state.close()

  // The stale peer is refused whole, in both directions, and nothing moves.
  for (const [from, to] of [
    [c, a],
    [a, c],
  ] as const) {
    const before = await listConversationArchiveSegments(
      (await readConversationArchiveGeneration(to)).segments,
    )
    const { staging, missing, report } = await exchangeConversationSegments(
      context,
      from,
      to,
    )
    assert.match(report.refusedExchange ?? '', /seed the generation/)
    assert.deepEqual(report.received, [])
    assert.equal((await fs.readdir(staging)).length, missing.length)
    assert.deepEqual(
      await listConversationArchiveSegments(
        (await readConversationArchiveGeneration(to)).segments,
      ),
      before,
    )
  }
  const stale = await stageMissingConversationSegments(context, c, a)
  // A sender that misreports its generation still stops at the barrier.
  const barred = await receiveConversationSegments({
    root: a,
    from: stale.staging,
    expectedGenerationId: g1,
  })
  assert.equal(barred.refused.length, stale.missing.length)
  assert.ok(barred.refused.length > 0)
  assert.equal((await fs.readdir(stale.staging)).length, stale.missing.length)

  // Same generation: deltas flow both ways.
  for (const [from, to] of [
    [b, a],
    [d, a],
    [a, b],
    [a, d],
  ] as const) {
    const { report } = await exchangeConversationSegments(context, from, to)
    assert.equal(report.refusedExchange, undefined)
    assert.deepEqual(report.refused, [])
  }
  const reopened = await openConversationSegmentState({
    root: b,
    statePath: join(b, 'state.sqlite3'),
  })
  assert.deepEqual(reopened.state.pendingDeliveries(), ['from-a', 'from-d'])
  reopened.state.close()

  // C converges only by seeding G1 and activating it.
  await seedConversationArchiveGeneration({
    root: c,
    from: await stageConversationGeneration(context, a, g1),
    generationId: g1,
  })
  await activateConversationArchiveGeneration({
    root: c,
    generationId: g1,
    updatedAt: '2026-10-18T00:00:00.000Z',
  })
  await exchangeConversationSegments(context, a, c)

  const installations = [a, b, c, d]
  for (const from of installations) {
    for (const to of installations) {
      if (from === to) continue
      const dry = await stageMissingConversationSegments(context, from, to)
      assert.deepEqual(dry.missing, [])
    }
  }
  const inventories = await Promise.all(
    installations.map(async (root) => {
      const inventory = await inventoryConversationSegmentArchive({
        root,
        statePath: join(root, 'state.sqlite3'),
      })
      return {
        generationId: inventory.generationId,
        segmentSetSha256: inventory.segmentSetSha256,
        conversations: inventory.conversations,
      }
    }),
  )
  const verified = await Promise.all(
    installations.map(async (root) =>
      verifyConversationSegmentArchive({ root }),
    ),
  )
  for (const index of [1, 2, 3]) {
    assert.deepEqual(inventories[index], inventories[0])
    assert.deepEqual(verified[index]?.digests, verified[0]?.digests)
    assert.equal(verified[index]?.ok, true)
  }
  assert.deepEqual(inventories[0], {
    ...inventories[0],
    generationId: g1,
    conversations: 5,
  })
})

void test('receive refuses tampered, foreign and unnamed base segments and leaves them staged', async (context) => {
  const { root, generation, segments } =
    await seedConversationSegmentArchive(context)
  const staging = await createConversationScratchDirectory(context, 'staged-')
  const good = createConversationSegment(
    [createConversationFragment({ id: 'good', events: 1 })],
    generation.generationId,
  )
  const tampered = createConversationSegment(
    [createConversationFragment({ id: 'tampered', events: 1 })],
    generation.generationId,
  )
  const foreign = createConversationSegment(
    [createConversationFragment({ id: 'foreign', events: 1 })],
    'f'.repeat(64),
  )
  const unnamedBase = createConversationSegment(
    [createConversationFragment({ id: 'base', events: 1 })],
    CONVERSATION_BASE_GENERATION_ID,
  )
  const write = async (name: string, text: string) =>
    fs.writeFile(join(staging, name), text)
  await write(`s_${hashText(good)}.jsonl`, good)
  await write(
    `s_${hashText(tampered)}.jsonl`,
    tampered.replace('event 0 of tampered', 'event 0 of altered!'),
  )
  await write(`s_${hashText(foreign)}.jsonl`, foreign)
  await write(`s_${hashText(unnamedBase)}.jsonl`, unnamedBase)
  await write('notes.txt', 'not a segment')
  await write('.s_partial.jsonl.Xy12', 'rsync temporary')

  const report = await receiveConversationSegments({
    root,
    from: staging,
    expectedGenerationId: generation.generationId,
  })
  assert.deepEqual(report.received, [hashText(good)])
  assert.deepEqual(report.ignored, ['.s_partial.jsonl.Xy12'])
  const reasons = new Map(
    report.refused.map((entry) => [entry.name, entry.reason]),
  )
  assert.match(
    reasons.get(`s_${hashText(tampered)}.jsonl`) ?? '',
    /does not hash to its own name/,
  )
  assert.match(
    reasons.get(`s_${hashText(foreign)}.jsonl`) ?? '',
    /belongs to generation/,
  )
  assert.match(
    reasons.get(`s_${hashText(unnamedBase)}.jsonl`) ?? '',
    /not named by this generation/,
  )
  assert.match(reasons.get('notes.txt') ?? '', /not a segment name/)
  assert.deepEqual(
    (await fs.readdir(staging)).toSorted(byName),
    [
      '.s_partial.jsonl.Xy12',
      'notes.txt',
      `s_${hashText(foreign)}.jsonl`,
      `s_${hashText(tampered)}.jsonl`,
      `s_${hashText(unnamedBase)}.jsonl`,
    ].toSorted(byName),
  )
  const present = await listConversationArchiveSegments(segments)
  assert.ok(present.includes(hashText(good)))
  assert.ok(!present.includes(hashText(tampered)))
  assert.ok(!present.includes(hashText(foreign)))
  assert.ok(!present.includes(hashText(unnamedBase)))
})

void test('an interrupted receive resumes cleanly on rerun', async (context) => {
  const { root, generation, segments } =
    await seedConversationSegmentArchive(context)
  const staging = await createConversationScratchDirectory(context, 'staged-')
  const texts = ['x', 'y', 'z'].map((id) =>
    createConversationSegment(
      [createConversationFragment({ id, events: 1 })],
      generation.generationId,
    ),
  )
  for (const text of texts) {
    await fs.writeFile(join(staging, `s_${hashText(text)}.jsonl`), text)
  }
  // The first run stopped after linking one segment, before removing its
  // staged copy, and left a writer's temporary file behind.
  const [linked] = texts
  assert.ok(linked !== undefined)
  await publishConversationSegment({
    segmentsDirectory: segments,
    text: linked,
  })
  await fs.writeFile(join(segments, '.tmp-1-interrupted'), 'half')

  const report = await receiveConversationSegments({
    root,
    from: staging,
    expectedGenerationId: generation.generationId,
  })
  assert.deepEqual(report.alreadyPresent, [hashText(linked)])
  assert.equal(report.received.length, 2)
  assert.deepEqual(report.refused, [])
  assert.deepEqual(await fs.readdir(staging), [])
  const verified = await verifyConversationSegmentArchive({ root })
  assert.equal(verified.ok, true)
  assert.equal(verified.conversations, 4)

  const again = await receiveConversationSegments({
    root,
    from: staging,
    expectedGenerationId: generation.generationId,
  })
  assert.deepEqual(again.received, [])
  assert.deepEqual(again.alreadyPresent, [])
})

void test('seed-generation refuses a generation it cannot fully verify', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const id = origin.generation.generationId
  const target = join(origin.root, 'target')

  const missingBase = await stageConversationGeneration(
    context,
    origin.root,
    id,
  )
  const [base] = origin.generation.baseSegmentSha256
  assert.ok(base !== undefined)
  await fs.rm(
    join(missingBase, 'generations', `g_${id}`, 'segments', `s_${base}.jsonl`),
  )
  await assert.rejects(
    seedConversationArchiveGeneration({
      root: target,
      from: missingBase,
      generationId: id,
    }),
    /base segments are not staged/,
  )

  const foreignDelta = await stageConversationGeneration(
    context,
    origin.root,
    id,
  )
  await publishConversationSegment({
    segmentsDirectory: join(foreignDelta, 'generations', `g_${id}`, 'segments'),
    text: createConversationSegment(
      [createConversationFragment({ id: 'old', events: 1 })],
      'e'.repeat(64),
    ),
  })
  await assert.rejects(
    seedConversationArchiveGeneration({
      root: target,
      from: foreignDelta,
      generationId: id,
    }),
    /belongs to generation/,
  )

  const relabelled = await stageConversationGeneration(context, origin.root, id)
  const forged = 'd'.repeat(64)
  await fs.rename(
    join(relabelled, 'generations', `g_${id}`),
    join(relabelled, 'generations', `g_${forged}`),
  )
  const manifest = join(
    relabelled,
    'generations',
    `g_${forged}`,
    'generation.json',
  )
  await fs.writeFile(
    manifest,
    (await fs.readFile(manifest, 'utf8')).replace(id, forged),
  )
  await assert.rejects(
    seedConversationArchiveGeneration({
      root: target,
      from: relabelled,
      generationId: forged,
    }),
    /not the one its base segments derive/,
  )
  assert.deepEqual(
    (await fs.readdir(join(target, 'generations')).catch(() => [])).filter(
      (name) => !name.startsWith('.'),
    ),
    [],
  )
})

void test('receive refuses a staging directory inside the root, symlinks included', async (context) => {
  const { root, generation, segments } =
    await seedConversationSegmentArchive(context)
  const before = await listConversationArchiveSegments(segments)
  const alias = join(
    await createConversationScratchDirectory(context, 'alias-'),
    'segments',
  )
  await fs.symlink(segments, alias)
  for (const from of [segments, alias, root]) {
    await assert.rejects(
      receiveConversationSegments({
        root,
        from,
        expectedGenerationId: generation.generationId,
      }),
      /inside the archive root/,
    )
  }
  assert.deepEqual(await listConversationArchiveSegments(segments), before)
})

void test('receive keeps the staged copy when the linked segment is corrupt', async (context) => {
  const { root, generation, segments } =
    await seedConversationSegmentArchive(context)
  const staging = await createConversationScratchDirectory(context, 'staged-')
  const text = createConversationSegment(
    [createConversationFragment({ id: 'x', events: 1 })],
    generation.generationId,
  )
  const name = `s_${hashText(text)}.jsonl`
  await fs.writeFile(join(staging, name), text)
  await fs.writeFile(join(segments, name), 'damaged')

  const report = await receiveConversationSegments({
    root,
    from: staging,
    expectedGenerationId: generation.generationId,
  })
  assert.deepEqual(report.alreadyPresent, [])
  assert.match(report.refused[0]?.reason ?? '', /destination corrupt/)
  assert.equal(await fs.readFile(join(staging, name), 'utf8'), text)
  assert.equal(await fs.readFile(join(segments, name), 'utf8'), 'damaged')
})

void test('seed writes the manifest it validated, not a second read', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const id = origin.generation.generationId
  const staging = await stageConversationGeneration(context, origin.root, id)
  const manifest = join(staging, 'generations', `g_${id}`, 'generation.json')
  // Re-formatted on the sender: same manifest, different bytes.
  await fs.writeFile(manifest, JSON.stringify(origin.generation, null, 4))
  const target = await createConversationScratchDirectory(context, 'seeded-')
  await seedConversationArchiveGeneration({
    root: target,
    from: staging,
    generationId: id,
  })
  assert.equal(
    await fs.readFile(
      join(target, 'generations', `g_${id}`, 'generation.json'),
      'utf8',
    ),
    `${JSON.stringify(origin.generation)}\n`,
  )
})

void test('seed refuses a held generation whose existing segment is corrupt', async (context) => {
  const origin = await seedConversationSegmentArchive(context)
  const id = origin.generation.generationId
  const staging = await stageConversationGeneration(context, origin.root, id)
  const [name] = (await fs.readdir(origin.segments)).filter((entry) =>
    entry.startsWith('s_'),
  )
  assert.ok(name)
  await fs.writeFile(join(origin.segments, name), 'damaged')

  await assert.rejects(
    seedConversationArchiveGeneration({
      root: origin.root,
      from: staging,
      generationId: id,
    }),
    /destination corrupt/,
  )
  assert.equal(
    await fs.readFile(join(origin.segments, name), 'utf8'),
    'damaged',
  )
})
