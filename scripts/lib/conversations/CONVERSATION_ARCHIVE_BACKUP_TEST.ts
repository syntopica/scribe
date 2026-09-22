import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { basename, join } from 'node:path'
import test from 'node:test'
import { createArchiveRecord } from './fixtures/createArchiveRecord'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { importConversationExport } from './importConversationExport'
import { writeConversationExport } from './writeConversationExport'

void test('a successful apply keeps one backup and prunes the older ones', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-archive-backup-',
  )
  const archive = join(root, 'archive.jsonl')
  const input = join(root, 'input.jsonl')
  await writeConversationExport([createArchiveRecord('a')], archive)
  await writeConversationExport([createArchiveRecord('b')], input)

  // Two stale generations from earlier runs, and three neighbours that carry
  // a similar name and must survive: another archive's backup, an interrupted
  // run's temporary file, and a copy someone named by hand.
  const stale = [
    join(root, 'archive.jsonl.backup-2026-09-04T12-36-00-000Z'),
    join(root, 'archive.jsonl.backup-2026-09-04T13-20-00-000Z'),
  ]
  const neighbours = [
    join(root, 'other.jsonl.backup-2026-09-04T13-20-00-000Z'),
    join(root, 'archive.jsonl.tmp-28652'),
    join(root, 'archive.jsonl.backup-recovered.jsonl'),
  ]
  for (const path of [...stale, ...neighbours]) await fs.writeFile(path, '')

  const first = await importConversationExport({
    input,
    archive,
    apply: true,
    now: new Date('2026-09-09T10:00:00Z'),
  })
  assert.equal(first.ok, true)
  assert.equal(first.added, 1)
  assert.notEqual(first.backup, undefined)
  assert.deepEqual(first.prunedBackups, stale)
  for (const path of stale) await assert.rejects(fs.access(path))
  for (const path of neighbours) await fs.access(path)
  await fs.access(first.backup ?? '')

  const second = await importConversationExport({
    input,
    archive,
    apply: true,
    now: new Date('2026-09-09T10:05:00Z'),
  })
  assert.equal(second.ok, true)
  assert.deepEqual(second.prunedBackups, [first.backup])
  await assert.rejects(fs.access(first.backup ?? ''))
  await fs.access(second.backup ?? '')
  const backups = (await fs.readdir(root)).filter((name) =>
    name.startsWith('archive.jsonl.backup-'),
  )
  assert.deepEqual(
    backups.toSorted((a, b) => a.localeCompare(b)),
    [basename(second.backup ?? ''), 'archive.jsonl.backup-recovered.jsonl'],
  )
})

void test('a dry run and a first apply prune nothing', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-archive-backup-first-',
  )
  const archive = join(root, 'archive.jsonl')
  const input = join(root, 'input.jsonl')
  await writeConversationExport([createArchiveRecord('a')], input)
  const stray = join(root, 'archive.jsonl.backup-2026-09-04T12-36-00-000Z')
  await fs.writeFile(stray, '')

  const dryRun = await importConversationExport({
    input,
    archive,
    apply: false,
  })
  assert.equal(dryRun.prunedBackups, undefined)
  await fs.access(stray)

  // No archive existed, so nothing was backed up and the stray copy is not
  // this run's to judge.
  const first = await importConversationExport({ input, archive, apply: true })
  assert.equal(first.backup, undefined)
  assert.equal(first.prunedBackups, undefined)
  await fs.access(stray)
})
