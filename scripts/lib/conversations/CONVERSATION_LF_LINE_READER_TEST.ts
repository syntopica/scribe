import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { forEachLfLine } from './forEachLfLine'

// The reader keeps an unterminated tail as pieces across 64 KiB chunks. These
// pin that the pieces reassemble into exactly the lines a plain split yields,
// with each line's terminated flag, for lines far longer than one chunk, lines
// that end exactly on a chunk boundary, and multi-byte text split by the
// decoder.
void test('lines spanning many chunks read back exactly, with their terminated flag', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-lf-line-',
  )
  const chunk = 64 * 1024
  const lines = [
    '',
    'short',
    'é€😀'.repeat(50_000),
    'x'.repeat(chunk - 1),
    'y'.repeat(chunk * 7 + 3),
    '',
    'z'.repeat(chunk),
    'unterminated tail ✓',
  ]
  const path = join(root, 'lines.jsonl')
  await fs.writeFile(path, lines.join('\n'))

  const read: [string, boolean][] = []
  await forEachLfLine(path, (line, terminated) => {
    read.push([line, terminated])
  })
  assert.deepEqual(
    read,
    lines.map((line, index) => [line, index < lines.length - 1]),
  )

  const terminatedPath = join(root, 'terminated.jsonl')
  await fs.writeFile(terminatedPath, `${lines.join('\n')}\n`)
  const terminated: [string, boolean][] = []
  await forEachLfLine(terminatedPath, (line, isTerminated) => {
    terminated.push([line, isTerminated])
  })
  assert.deepEqual(
    terminated,
    lines.map((line) => [line, true]),
  )
})
