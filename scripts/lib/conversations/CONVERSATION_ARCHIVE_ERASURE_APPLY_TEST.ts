import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { applyConversationArchiveErasure } from './applyConversationArchiveErasure'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { ERASURE_FIXTURE_FRAGMENTS } from './fixtures/ERASURE_FIXTURE_FRAGMENTS'
import { planErasureAgainstArchive } from './fixtures/planErasureAgainstArchive'
import { seedErasureArchiveWithCapture } from './fixtures/seedErasureArchiveWithCapture'
import { hashConversationFragment } from './hashConversationFragment'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationGenerationLineage } from './readConversationGenerationLineage'
import { verifyConversationArchiveErasure } from './verifyConversationArchiveErasure'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

void test('an erasure seals a generation without the fragment and selects nothing', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  const plan = await planErasureAgainstArchive({
    root,
    removeFragmentSha256: [
      hashConversationFragment(ERASURE_FIXTURE_FRAGMENTS.leaked),
    ],
  })

  const applied = await applyConversationArchiveErasure({
    root,
    plan,
    createdAt: '2026-10-11T12:01:00.000Z',
    buckets: 2,
  })
  assert.equal(applied.fragmentsRemoved, 1)
  assert.equal(applied.fragmentsKept, 3)
  assert.deepEqual(applied.unmatched, [])
  assert.notEqual(applied.generationId, generation.generationId)

  // Cutover is a separate decision: the archive is still on the old generation.
  const current = await readConversationArchiveGeneration(root)
  assert.equal(current.generation.generationId, generation.generationId)

  const verified = await verifyConversationArchiveErasure({
    root,
    plan,
    generationId: applied.generationId,
  })
  assert.equal(verified.ok, true, JSON.stringify(verified))
  assert.equal(verified.fragmentsBefore, 4)
  assert.equal(verified.fragmentsAfter, 3)

  // The captured segment was folded into the new base, and its host with it.
  await activateConversationArchiveGeneration({
    root,
    generationId: applied.generationId,
    updatedAt: '2026-10-11T12:02:00.000Z',
  })
  const after = await verifyConversationSegmentArchive({ root })
  assert.equal(after.ok, true)
  assert.equal(after.generationId, applied.generationId)
  assert.equal(after.conversations, 3)
  assert.equal(after.segments, after.baseSegments)
  const sealed = await readConversationArchiveGenerationManifest(
    root,
    applied.generationId,
  )
  const texts = await Promise.all(
    sealed.generation.baseSegmentSha256.map(async (sha256) =>
      fs.readFile(join(sealed.segments, `s_${sha256}.jsonl`), 'utf8'),
    ),
  )
  assert.equal(texts.join('').includes('"peer-b"'), true)
  assert.equal(
    texts
      .join('')
      .includes(hashConversationFragment(ERASURE_FIXTURE_FRAGMENTS.leaked)),
    false,
  )
})

void test('a plan computed before the archive moved is refused', async (context) => {
  const { root, segments, generation } =
    await seedErasureArchiveWithCapture(context)
  const plan = await planErasureAgainstArchive({
    root,
    removeConversationIds: ['a'],
  })
  await publishConversationSegment({
    segmentsDirectory: segments,
    text: createConversationSegment(
      [createConversationFragment({ id: 'd', events: 1 })],
      generation.generationId,
    ),
  })

  await assert.rejects(
    applyConversationArchiveErasure({
      root,
      plan,
      createdAt: '2026-10-11T12:01:00.000Z',
    }),
    /has moved since the plan was computed/,
  )
  await assert.rejects(
    applyConversationArchiveErasure({
      root,
      plan: { ...plan, fromGenerationId: 'another-generation' },
      createdAt: '2026-10-11T12:01:00.000Z',
    }),
    /computed against generation another-generation/,
  )
})

void test('a stale peer segment copied into the new generation is refused', async (context) => {
  const { root, segments: oldSegments } =
    await seedErasureArchiveWithCapture(context)
  const plan = await planErasureAgainstArchive({
    root,
    removeFragmentSha256: [
      hashConversationFragment(ERASURE_FIXTURE_FRAGMENTS.leaked),
    ],
  })
  const applied = await applyConversationArchiveErasure({
    root,
    plan,
    createdAt: '2026-10-11T12:01:00.000Z',
  })
  const sealed = await readConversationArchiveGenerationManifest(
    root,
    applied.generationId,
  )

  // A peer still on the old generation hands over every segment it holds,
  // including the base that carries the erased bytes and its capture segment.
  for (const name of await fs.readdir(oldSegments)) {
    await fs.copyFile(join(oldSegments, name), join(sealed.segments, name))
  }

  const verified = await verifyConversationArchiveErasure({
    root,
    plan,
    generationId: applied.generationId,
  })
  assert.equal(verified.ok, false)
  assert.deepEqual(verified.removedPresent, [])
  assert.equal(
    verified.problems.some((problem) =>
      problem.includes('is not named by this generation'),
    ),
    true,
  )
  assert.equal(
    verified.problems.some((problem) =>
      problem.includes('belongs to generation'),
    ),
    true,
  )
})

void test('rolling back is selecting the old generation again', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  const before = await verifyConversationSegmentArchive({ root })
  const plan = await planErasureAgainstArchive({
    root,
    removeConversationIds: ['a'],
  })
  const applied = await applyConversationArchiveErasure({
    root,
    plan,
    createdAt: '2026-10-11T12:01:00.000Z',
  })
  await activateConversationArchiveGeneration({
    root,
    generationId: applied.generationId,
    updatedAt: '2026-10-11T12:02:00.000Z',
  })
  assert.equal(
    (await verifyConversationSegmentArchive({ root })).conversations,
    2,
  )

  await activateConversationArchiveGeneration({
    root,
    generationId: generation.generationId,
    updatedAt: '2026-10-11T12:03:00.000Z',
  })
  const restored = await verifyConversationSegmentArchive({ root })
  assert.equal(restored.ok, true)
  assert.equal(restored.generationId, generation.generationId)
  assert.deepEqual(restored.digests, before.digests)
})

void test('a generation the archive does not hold cannot be selected', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  await assert.rejects(
    activateConversationArchiveGeneration({
      root,
      generationId: 'f'.repeat(64),
      updatedAt: '2026-10-11T12:02:00.000Z',
    }),
    /ENOENT/,
  )
  const current = await readConversationArchiveGeneration(root)
  assert.equal(current.generation.generationId, generation.generationId)
})

void test('each erasure records its parent, and the lineage walks them newest first', async (context) => {
  const { root, generation } = await seedErasureArchiveWithCapture(context)
  const first = await applyConversationArchiveErasure({
    root,
    plan: await planErasureAgainstArchive({
      root,
      removeFragmentSha256: [
        hashConversationFragment(ERASURE_FIXTURE_FRAGMENTS.leaked),
      ],
    }),
    createdAt: '2026-10-11T12:01:00.000Z',
  })
  await activateConversationArchiveGeneration({
    root,
    generationId: first.generationId,
    updatedAt: '2026-10-11T12:02:00.000Z',
  })
  const second = await applyConversationArchiveErasure({
    root,
    plan: await planErasureAgainstArchive({
      root,
      removeConversationIds: ['b'],
    }),
    createdAt: '2026-10-11T12:03:00.000Z',
  })
  const newest = await readConversationArchiveGenerationManifest(
    root,
    second.generationId,
  )
  assert.equal(newest.generation.parentGenerationId, first.generationId)
  assert.deepEqual(
    await readConversationGenerationLineage(root, newest.generation),
    [first.generationId, generation.generationId],
  )

  // A purged ancestor ends the lineage rather than inventing one.
  const purged = await readConversationArchiveGenerationManifest(
    root,
    first.generationId,
  )
  await fs.rm(purged.paths.generation ?? '', { recursive: true, force: true })
  assert.deepEqual(
    await readConversationGenerationLineage(root, newest.generation),
    [],
  )
})
