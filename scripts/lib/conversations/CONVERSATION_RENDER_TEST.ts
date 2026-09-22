import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createConversationRecord } from './fixtures/createConversationRecord'
import { renderConversationArchive } from './renderConversationArchive'
import { writeConversationExport } from './writeConversationExport'

void test('render produces a dry-run plan and a Memstore-readable Markdown corpus', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'rocket-conversations-render-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const input = join(root, 'input.jsonl')
  const outputDirectory = join(root, 'rendered')
  const record = createConversationRecord()
  await writeConversationExport(
    [record],
    input,
    new Date('2026-08-19T10:00:00Z'),
  )

  const dryRun = await renderConversationArchive({
    input,
    outputDirectory,
    apply: false,
  })
  assert.equal(dryRun.applied, false)
  await assert.rejects(fs.access(outputDirectory))

  const applied = await renderConversationArchive({
    input,
    outputDirectory,
    apply: true,
  })
  assert.equal(applied.files, 1)
  const rendered = await fs.readFile(
    join(outputDirectory, `${record.id}.md`),
    'utf8',
  )
  assert.match(rendered, /^# Remember this decision/mu)
  assert.match(rendered, /^## user - message/mu)
})
