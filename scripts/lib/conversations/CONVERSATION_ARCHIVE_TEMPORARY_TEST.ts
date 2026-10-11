import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createArchiveRecord } from './fixtures/createArchiveRecord'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { exitedProcessId } from './fixtures/exitedProcessId'
import { importConversationExport } from './importConversationExport'
import { rewriteConversationArchive } from './rewriteConversationArchive'
import { writeConversationExport } from './writeConversationExport'

void test('an apply removes temporaries whose writer is gone and keeps the rest', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-archive-temporary-',
  )
  const archive = join(root, 'archive.jsonl')
  const input = join(root, 'input.jsonl')
  await writeConversationExport([createArchiveRecord('a')], archive)
  await writeConversationExport([createArchiveRecord('b')], input)

  const abandoned = join(root, `archive.jsonl.tmp-${String(exitedProcessId())}`)
  const kept = [
    join(root, `archive.jsonl.tmp-${String(process.ppid)}`),
    join(root, 'archive.jsonl.tmp-notapid'),
    join(root, `other.jsonl.tmp-${String(exitedProcessId())}`),
  ]
  for (const path of [abandoned, ...kept]) await fs.writeFile(path, 'partial')

  const dryRun = await importConversationExport({
    input,
    archive,
    apply: false,
  })
  assert.equal(dryRun.removedTemporaries, undefined)
  await fs.access(abandoned)

  const applied = await importConversationExport({
    input,
    archive,
    apply: true,
  })
  assert.equal(applied.ok, true)
  assert.deepEqual(applied.removedTemporaries, [abandoned])
  await assert.rejects(fs.access(abandoned))
  for (const path of kept) await fs.access(path)
})

void test('a rewrite apply removes an abandoned temporary too', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-rewrite-temporary-',
  )
  const archive = join(root, 'archive.jsonl')
  const home = '/Users/someone'
  const record = createArchiveRecord('a')
  await writeConversationExport(
    [{ ...record, workspace: `${home}/project` }],
    archive,
  )
  const abandoned = join(root, `archive.jsonl.tmp-${String(exitedProcessId())}`)
  await fs.writeFile(abandoned, 'partial')

  const result = await rewriteConversationArchive({
    archive,
    homes: [home],
    apply: true,
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.applied, true)
  assert.deepEqual(result.removedTemporaries, [abandoned])
  await assert.rejects(fs.access(abandoned))
})
