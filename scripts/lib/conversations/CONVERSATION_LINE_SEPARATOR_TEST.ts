import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createConversationRecordWithLineSeparators } from './fixtures/createConversationRecordWithLineSeparators'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { forEachLfLine } from './forEachLfLine'
import { readConversationExport } from './readConversationExport'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'
import { writeConversationExport } from './writeConversationExport'

// Node's readline and Python's splitlines treat U+2028 and U+2029 as line
// terminators, and a reader built on either saw 32,434 lines where the live
// archive holds 30,741 records. The rule for every reader and every format is
// to split on `\n` alone; this pins the two readers this repository owns and
// the canonical serialization to it.
void test('line separators inside event text never split a record line', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-line-separator-',
  )
  const record = createConversationRecordWithLineSeparators()
  const text = record.events[0]?.text ?? ''
  const canonical = serializeCanonicalConversationRecord(record)
  assert.equal(canonical.includes(' '), false)
  assert.equal(canonical.includes(' '), false)
  assert.equal(
    (JSON.parse(canonical) as ConversationRecord).events[0]?.text,
    text,
  )

  const raw = JSON.stringify(record)
  assert.equal(raw.includes(' '), true)
  const path = join(root, 'records.jsonl')
  await fs.writeFile(path, `${raw}\n${canonical}\n${raw}\n`)

  const lines: string[] = []
  await forEachLfLine(path, (line) => {
    if (line.length > 0) lines.push(line)
  })
  assert.equal(lines.length, 3)
  for (const line of lines) {
    assert.equal((JSON.parse(line) as ConversationRecord).events[0]?.text, text)
  }
})

void test('a v1 export round-trips raw line separators in event text', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-line-separator-export-',
  )
  const record = createConversationRecordWithLineSeparators()
  const output = join(root, 'export.jsonl')
  await writeConversationExport(
    [record],
    output,
    new Date('2026-08-19T10:00:00Z'),
  )
  const read = await readConversationExport(output)
  assert.deepEqual(read.errors, [])
  assert.equal(read.records.length, 1)
  const [first] = read.records
  if (first === undefined) throw new Error('expected one record')
  assert.equal(first.events[0]?.text, record.events[0]?.text)
  assert.equal(first.title, record.title)
})
