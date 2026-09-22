import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { createConversationRecord } from './fixtures/createConversationRecord'
import { hashText } from './hashText'
import { importConversationExport } from './importConversationExport'
import { readConversationExport } from './readConversationExport'
import { writeConversationExport } from './writeConversationExport'
import { writeConversationExportFromStore } from './writeConversationExportFromStore'

void test('exports carry a verified manifest and reject tampering', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-export-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const output = join(root, 'export.jsonl')
  await writeConversationExport(
    [createConversationRecord()],
    output,
    new Date('2026-08-19T10:00:00Z'),
  )

  const valid = await readConversationExport(output)
  assert.deepEqual(valid.errors, [])
  assert.equal(valid.records.length, 1)
  assert.equal(valid.manifest?.createdAt, '2026-08-19T10:00:00.000Z')

  await fs.appendFile(output, '{}\n')
  const tampered = await readConversationExport(output)
  assert.equal(
    tampered.errors.includes('export content hash does not match the manifest'),
    true,
  )
})

void test('streamed exports preserve manifests without retaining the archive in memory', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-stream-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  const output = join(root, 'export.jsonl')
  try {
    store.mergeFragment(createConversationRecord())
    await writeConversationExportFromStore(
      store,
      output,
      new Date('2026-08-19T10:00:00Z'),
    )
  } finally {
    store.close()
  }

  const valid = await readConversationExport(output)
  assert.deepEqual(valid.errors, [])
  assert.equal(valid.records.length, 1)
  assert.equal(valid.manifest?.records, 1)
})

void test('a partial export declares itself incomplete and lists every skip', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-partial-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  const output = join(root, 'export.jsonl')
  const skipped = ['codex:sessions/huge.jsonl: file exceeds 64 MiB limit']
  try {
    store.mergeFragment(createConversationRecord())
    await writeConversationExportFromStore(
      store,
      output,
      new Date('2026-08-19T10:00:00Z'),
      skipped,
    )
  } finally {
    store.close()
  }

  const partial = await readConversationExport(output)
  assert.deepEqual(partial.errors, [])
  const manifest = partial.manifest
  if (manifest === undefined)
    throw new Error('partial export lost its manifest')
  assert.equal(manifest.complete, false)
  assert.deepEqual(manifest.skipped, skipped)
})

void test('a complete export carries no completeness fields', async (context) => {
  const root = await fs.mkdtemp(
    join(tmpdir(), 'rocket-conversations-complete-'),
  )
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  const output = join(root, 'export.jsonl')
  try {
    store.mergeFragment(createConversationRecord())
    await writeConversationExportFromStore(
      store,
      output,
      new Date('2026-08-19T10:00:00Z'),
    )
  } finally {
    store.close()
  }

  const complete = await readConversationExport(output)
  assert.deepEqual(complete.errors, [])
  const manifest = complete.manifest
  if (manifest === undefined)
    throw new Error('complete export lost its manifest')
  assert.equal('complete' in manifest, false)
  assert.equal('skipped' in manifest, false)
})

void test('imports are dry-run by default and back up an existing archive on apply', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-import-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const input = join(root, 'input.jsonl')
  const archive = join(root, 'archive.jsonl')
  const record = createConversationRecord()
  await writeConversationExport(
    [record],
    input,
    new Date('2026-08-19T10:00:00Z'),
  )

  const dryRun = await importConversationExport({
    input,
    archive,
    apply: false,
  })
  assert.equal(dryRun.applied, false)
  await assert.rejects(fs.access(archive))

  const first = await importConversationExport({
    input,
    archive,
    apply: true,
    now: new Date('2026-08-19T10:01:00Z'),
  })
  assert.equal(first.added, 1)
  assert.equal(first.backup, undefined)

  const second = await importConversationExport({
    input,
    archive,
    apply: true,
    now: new Date('2026-08-19T10:02:00Z'),
  })
  assert.equal(second.duplicates, 1)
  assert.notEqual(second.backup, undefined)
  await fs.access(second.backup ?? '')
})

void test('an export never carries records older than the manifest that covers them', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-version-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  const output = join(root, 'export.jsonl')
  const legacy = { ...createConversationRecord(), schemaVersion: 1 as const }
  try {
    store.mergeFragment(legacy)
    await writeConversationExportFromStore(
      store,
      output,
      new Date('2026-08-31T10:00:00Z'),
    )
  } finally {
    store.close()
  }

  const written = await readConversationExport(output)
  assert.deepEqual(written.errors, [])
  assert.equal(written.manifest?.schemaVersion, 2)
  // The header used to say 2 while every row underneath was still 1, so a
  // reader assumed event ids that carried a conversation and got ids that did
  // not. Measured on the real 4 GB archive on 2026-08-31.
  assert.deepEqual(
    written.records.map(({ schemaVersion }) => schemaVersion),
    [2],
  )
  assert.deepEqual(
    written.records[0]?.events.map(({ id }) => id),
    legacy.events.map(({ id }) => hashText(`${legacy.id}\0${id}`)),
  )
})

void test('the store yields current records verbatim and older ones upgraded', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-store-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  context.after(() => {
    store.close()
  })

  // The schema version is a column now, so the read path can skip parsing a
  // record that is already current. That shortcut must not skip the upgrade a
  // version 1 record still needs: an archive holds years of them, and a
  // manifest declaring version 2 over version 1 records is a lie a consumer
  // acts on.
  const current = { ...createConversationRecord(), id: 'current' }
  const older = {
    ...createConversationRecord(),
    id: 'older',
    schemaVersion: 1 as const,
    events: [
      {
        id: 'bare',
        kind: 'message' as const,
        role: 'user' as const,
        text: 'one',
      },
    ],
  }
  store.mergeFragment(current)
  store.mergeFragment(older)

  const yielded = [...store.serializedRecords()].map(
    (line) => JSON.parse(line) as { id: string; schemaVersion: number },
  )
  assert.deepEqual(
    yielded.map((record) => record.schemaVersion),
    [2, 2],
    'every record leaves the store at the version the manifest declares',
  )
  const passedThrough = [...store.serializedRecords()].find((line) =>
    line.includes('"id":"current"'),
  )
  assert.equal(
    passedThrough,
    JSON.stringify(current),
    'a record already at the current version is not reserialized',
  )
  const upgraded = yielded.find((record) => record.id === 'older')
  assert.notEqual(
    (upgraded as unknown as { events: { id: string }[] }).events[0]?.id,
    'bare',
    'a version 1 event id is qualified on the way out',
  )
})
