import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationArchiveState } from './ConversationArchiveState'
import { captureConversationArtifactsIncrementally } from './captureConversationArtifactsIncrementally'
import { conversationCaptureVersionStamp } from './conversationCaptureVersionStamp'
import { fingerprintConversationArtifact } from './fingerprintConversationArtifact'
import { CONVERSATION_CAPTURE_FIXTURE_SOURCES } from './fixtures/CONVERSATION_CAPTURE_FIXTURE_SOURCES'
import { createConversationCaptureInstallation } from './fixtures/createConversationCaptureInstallation'
import { writeClaudeConversationArtifact } from './fixtures/writeClaudeConversationArtifact'
import { publishConversationCapture } from './publishConversationCapture'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'

void test('the first capture publishes one segment for what it found', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  await writeClaudeConversationArtifact({ home, session: 's2', turns: 2 })

  const result = await capture('2026-09-01T09:00:00.000Z')
  assert.equal(result.metrics.ok, true)
  assert.equal(result.metrics.fullyParsed, 2)
  assert.equal(result.metrics.fragmentsAppended, 2)
  assert.equal(result.segments.at(0)?.fragments, 2)
  assert.equal(result.conversationsChanged, 2)
  assert.equal(result.counts.conversations, 2)
})

void test('a capture that finds nothing new writes nothing and reads nothing', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  await capture('2026-09-01T09:00:00.000Z')

  const warm = await capture('2026-09-01T10:00:00.000Z')
  assert.equal(warm.metrics.cacheHits, 1)
  assert.equal(warm.metrics.fullyParsed, 0)
  assert.equal(warm.metrics.payloadBytesRead, 0)
  assert.equal(warm.metrics.recordsNormalized, 0)
  assert.equal(warm.metrics.fragmentsAppended, 0)
  assert.deepEqual(warm.segments, [])
  assert.equal(warm.counts.segments, 1)
})

void test('one changed artifact costs one artifact of reading', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  for (const session of ['s1', 's2', 's3']) {
    await writeClaudeConversationArtifact({ home, session, turns: 4 })
  }
  await capture('2026-09-01T09:00:00.000Z')

  const path = await writeClaudeConversationArtifact({
    home,
    session: 's2',
    turns: 6,
  })
  const changed = await capture('2026-09-01T11:00:00.000Z')
  assert.equal(changed.metrics.cacheHits, 2)
  assert.equal(changed.metrics.fullyParsed, 1)
  assert.equal(changed.metrics.payloadBytesRead, (await fs.stat(path)).size)
  assert.equal(changed.metrics.fragmentsAppended, 1)
  assert.equal(changed.conversationsChanged, 1)
  assert.equal(changed.counts.segments, 2)
  // The longer capture does not replace the shorter one: both fragments stay,
  // which is what kept three events alive when one machine held 353 and
  // another 356.
  assert.equal(changed.counts.fragments, 4)
})

void test('a same-size rewrite with a restored mtime is still a change', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  const path = await writeClaudeConversationArtifact({
    home,
    session: 's1',
    turns: 4,
  })
  await capture('2026-09-01T09:00:00.000Z')

  const original = await fs.readFile(path, 'utf8')
  const before = await fs.stat(path)
  const rewritten = original.replace('turn 0 of s1', 'turn X of s1')
  assert.equal(rewritten.length, original.length)
  await fs.writeFile(path, rewritten)
  await fs.utimes(path, before.atime, before.mtime)

  const result = await capture('2026-09-01T10:00:00.000Z')
  assert.equal(result.metrics.cacheHits, 0)
  assert.equal(result.metrics.fullyParsed, 1)
  assert.equal(result.metrics.fragmentsAppended, 1)
})

void test('an atomically replaced artifact is a change even at the same size', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  const path = await writeClaudeConversationArtifact({
    home,
    session: 's1',
    turns: 4,
  })
  await capture('2026-09-01T09:00:00.000Z')

  const before = await fs.stat(path)
  const replacement = `${path}.new`
  await fs.writeFile(
    replacement,
    (await fs.readFile(path, 'utf8')).replace('turn 1 of s1', 'turn Y of s1'),
  )
  await fs.rename(replacement, path)
  await fs.utimes(path, before.atime, before.mtime)

  const result = await capture('2026-09-01T10:00:00.000Z')
  assert.equal(result.metrics.cacheHits, 0)
  assert.equal(result.metrics.fragmentsAppended, 1)
})

void test('a deleted artifact costs one cache row and no archived conversation', async (context) => {
  const { home, capture } = await createConversationCaptureInstallation(context)
  const path = await writeClaudeConversationArtifact({
    home,
    session: 's1',
    turns: 4,
  })
  const first = await capture('2026-09-01T09:00:00.000Z')
  assert.equal(first.counts.conversations, 1)

  await fs.rm(path)
  const afterDeletion = await capture('2026-09-01T10:00:00.000Z')
  assert.equal(afterDeletion.metrics.forgottenArtifacts, 1)
  assert.equal(afterDeletion.metrics.fragmentsAppended, 0)
  assert.deepEqual(afterDeletion.segments, [])
  // The archive exists to outlive the tools that wrote it. A rollout Codex
  // rotated away must not take its conversation with it.
  assert.equal(afterDeletion.counts.conversations, 1)
  assert.equal(afterDeletion.counts.artifacts, 0)
})

void test('a cache row whose fragments are no longer published is a miss', async (context) => {
  const { home, root } = await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  const { generation, segments } = await readConversationArchiveGeneration(root)
  const statePath = join(home, 'state.sqlite3')
  const state = new ConversationArchiveState(statePath)
  context.after(() => {
    state.close()
  })

  // The state a reseed to an older head leaves behind: the file on disk is
  // genuinely unchanged, and the fragments it produced are genuinely gone.
  const artifact = {
    path: join(home, '.claude', 'projects', 'fixture', 's1.jsonl'),
    relativePath: '.claude/projects/fixture/s1.jsonl',
    source: 'claude-code' as const,
    storage: 'jsonl' as const,
  }
  const fingerprint = await fingerprintConversationArtifact(artifact)
  assert.notEqual(fingerprint, undefined)
  if (fingerprint === undefined) return
  state.putArtifact({
    source: artifact.source,
    relativePath: artifact.relativePath,
    storageKind: artifact.storage,
    generationId: generation.generationId,
    fingerprint,
    captureVersions: conversationCaptureVersionStamp(),
    fragmentHashes: ['f'.repeat(64)],
  })

  const metrics = await captureConversationArtifactsIncrementally({
    home,
    sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
    state,
    generationId: generation.generationId,
    onArtifact: () => undefined,
  })
  assert.equal(segments.length > 0, true)
  assert.equal(metrics.cacheHits, 0)
  assert.equal(metrics.fullyParsed, 1)
})

void test('a new capture version invalidates every cached artifact', async (context) => {
  const { home, root } = await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  await publishConversationCapture({
    home,
    root,
    statePath: join(home, 'state.sqlite3'),
    sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
    createdAt: '2026-09-01T09:00:00.000Z',
  })

  const { generation } = await readConversationArchiveGeneration(root)
  const state = new ConversationArchiveState(join(home, 'state.sqlite3'))
  context.after(() => {
    state.close()
  })
  const key = {
    source: 'claude-code',
    relativePath: '.claude/projects/fixture/s1.jsonl',
    storageKind: 'jsonl',
  }
  const row = state.artifact(key)
  assert.notEqual(row, undefined)
  if (row === undefined) return
  state.putArtifact({
    ...key,
    generationId: row.generationId,
    fingerprint: row.fingerprint,
    fragmentHashes: row.fragmentHashes,
    captureVersions: 'n1.r1.a1-older-build',
  })

  const metrics = await captureConversationArtifactsIncrementally({
    home,
    sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
    state,
    generationId: generation.generationId,
    onArtifact: () => undefined,
  })
  assert.equal(metrics.cacheHits, 0)
  assert.equal(metrics.fullyParsed, 1)
})
