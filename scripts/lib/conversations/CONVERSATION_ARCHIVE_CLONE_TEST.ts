import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { cloneArchiveFile } from './cloneArchiveFile'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'

void test('a clone carries the bytes and survives the source being replaced', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-archive-clone-',
  )
  const source = join(root, 'archive.jsonl')
  const target = join(root, 'archive.jsonl.backup')
  await fs.writeFile(source, 'old\n')

  await cloneArchiveFile(source, target)
  await fs.writeFile(`${source}.tmp`, 'new\n')
  await fs.rename(`${source}.tmp`, source)

  assert.equal(await fs.readFile(target, 'utf8'), 'old\n')
})

void test('a clone refuses to overwrite an existing target', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-archive-clone-',
  )
  const source = join(root, 'archive.jsonl')
  const target = join(root, 'archive.jsonl.backup')
  await fs.writeFile(source, 'source\n')
  await fs.writeFile(target, 'kept\n')

  await assert.rejects(cloneArchiveFile(source, target))
  assert.equal(await fs.readFile(target, 'utf8'), 'kept\n')
})
