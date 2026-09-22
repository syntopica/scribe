import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { writeDamagedConversationArchive } from './fixtures/writeDamagedConversationArchive'
import { readConversationExport } from './readConversationExport'
import { rewriteConversationArchive } from './rewriteConversationArchive'
import type { ConversationRecord } from './types/ConversationRecord'
import { writeConversationExport } from './writeConversationExport'

void test('a dry run counts what would change and leaves the archive byte for byte', async (context) => {
  const { home, archive, joinedPath } =
    await writeDamagedConversationArchive(context)
  const before = await fs.readFile(archive)
  const result = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: false,
  })
  assert.equal(result.ok, true)
  assert.equal(result.applied, false)
  assert.deepEqual(result.changes, {
    records: 2,
    changed: 1,
    pathsNormalized: 1,
    pathBytesSaved: joinedPath.length - 'a.jsonl,b.jsonl'.length,
    titlesRedacted: 1,
    workspacesRedacted: 1,
    eventsRedacted: 1,
    legacyRecords: 0,
  })
  assert.deepEqual(await fs.readFile(archive), before)
})

void test('an apply keeps ids, hashes and hosts, redacts and dedups, and is a fixed point', async (context) => {
  const { home, root, archive, records } =
    await writeDamagedConversationArchive(context)
  const original = await fs.readFile(archive)
  const applied = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: true,
    now: new Date('2026-09-09T22:00:00Z'),
  })
  assert.deepEqual(applied.errors, [])
  assert.equal(applied.applied, true)
  assert.equal(applied.changes.changed, 1)
  assert.deepEqual(await fs.readFile(applied.backup ?? ''), original)

  const {
    records: rewritten,
    errors,
    manifest,
  } = await readConversationExport(archive)
  assert.deepEqual(errors, [])
  assert.equal(manifest?.contentSha256, applied.contentSha256)
  const leaked = rewritten.find((record) => record.id === 'leaked')
  const clean = rewritten.find((record) => record.id === 'clean')
  assert.ok(leaked)
  assert.ok(clean)
  assert.equal(leaked.title, '[HOME]/p/app')
  assert.equal(leaked.workspace, '[HOME]/p/app')
  assert.equal(leaked.events[0]?.text, 'cd [HOME]/p/app')
  assert.equal(leaked.provenance.relativePath, 'a.jsonl,b.jsonl')
  assert.equal(
    leaked.provenance.contentSha256,
    records[0]?.provenance.contentSha256,
  )
  assert.deepEqual(
    leaked.events.map((event) => event.id),
    records[0]?.events.map((event) => event.id),
  )
  assert.deepEqual(leaked.hosts, ['peer-a'])
  assert.deepEqual(clean, records[1])

  const again = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: true,
  })
  assert.equal(again.ok, true)
  assert.equal(again.applied, false)
  assert.equal(again.changes.changed, 0)
  const backups = (await fs.readdir(root)).filter((name) =>
    name.startsWith('archive.jsonl.backup-'),
  )
  assert.equal(backups.length, 1)
})

void test('a legacy record refuses the apply and a repeated id refuses it too', async (context) => {
  const home = '/Users/someone'
  const root = await createConversationScratchDirectory(
    context,
    'conversation-rewrite-refuse-',
  )
  const legacy: ConversationRecord = {
    ...createConversationFragment({ id: 'old', events: 1 }),
    schemaVersion: 1,
    workspace: `${home}/p/old`,
  }
  const archive = join(root, 'legacy.jsonl')
  // Written by hand: the export writer would upgrade the record on the way in.
  const line = JSON.stringify(legacy)
  const { createHash } = await import('node:crypto')
  const manifest = {
    kind: 'rocket-agents-conversation-export',
    schemaVersion: 2,
    createdAt: '2026-09-09T22:00:00.000Z',
    records: 1,
    contentSha256: createHash('sha256').update(`${line}\n`).digest('hex'),
  }
  await fs.writeFile(archive, `${JSON.stringify(manifest)}\n${line}\n`)
  const dry = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: false,
  })
  assert.equal(dry.ok, true)
  assert.equal(dry.changes.legacyRecords, 1)
  const refused = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: true,
  })
  assert.equal(refused.ok, false)
  assert.equal(refused.applied, false)
  assert.match(refused.errors[0] ?? '', /schema 1/u)

  const twice = join(root, 'twice.jsonl')
  const one = {
    ...createConversationFragment({ id: 'dup', events: 1 }),
    workspace: `${home}/x`,
  }
  await writeConversationExport([one, one], twice)
  const repeated = await rewriteConversationArchive({
    archive: twice,
    homes: [home],
    apply: true,
  })
  assert.equal(repeated.ok, false)
  assert.match(repeated.errors[0] ?? '', /repeats 1 conversation ids/u)
  assert.equal((await readConversationExport(twice)).records.length, 2)
})

void test('a flag token or a relative name is not a home prefix', async (context) => {
  const { archive } = await writeDamagedConversationArchive(context)
  const before = await fs.readFile(archive)
  for (const homes of [
    ['--apply'],
    ['Users/someone'],
    ['/'],
    ['/Users/someone/'],
  ]) {
    const refused = await rewriteConversationArchive({
      archive,
      homes,
      apply: true,
    })
    assert.equal(refused.ok, false)
    assert.match(refused.errors[0] ?? '', /absolute paths/u)
  }
  assert.deepEqual(await fs.readFile(archive), before)
})

void test('a partial export stays partial after the rewrite', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-rewrite-partial-',
  )
  const home = '/Users/someone'
  const record = {
    ...createConversationFragment({ id: 'p', events: 1 }),
    workspace: `${home}/p`,
  }
  const line = JSON.stringify(record)
  const { createHash } = await import('node:crypto')
  const archive = join(root, 'partial.jsonl')
  const manifest = {
    kind: 'rocket-agents-conversation-export',
    schemaVersion: 2,
    createdAt: '2026-09-09T22:00:00.000Z',
    records: 1,
    contentSha256: createHash('sha256').update(`${line}\n`).digest('hex'),
    complete: false,
    skipped: ['codex:rollout-too-large.jsonl: file exceeds 64 MiB limit'],
  }
  await fs.writeFile(archive, `${JSON.stringify(manifest)}\n${line}\n`)
  const applied = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: true,
  })
  assert.deepEqual(applied.errors, [])
  const after = await readConversationExport(archive)
  assert.deepEqual(after.errors, [])
  assert.ok(after.manifest)
  assert.equal(after.manifest.complete, false)
  assert.deepEqual(after.manifest.skipped, manifest.skipped)
  const [rewrittenPartial] = after.records
  assert.ok(rewrittenPartial)
  assert.equal(rewrittenPartial.workspace, '[HOME]/p')
})
