import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createArchiveRecord } from './fixtures/createArchiveRecord'
import { importConversationExport } from './importConversationExport'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeConversationExport } from './writeConversationExport'

void test('a first import creates the archive directory it is given', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-provisioning-'))
  try {
    // A freshly provisioned peer has the checkout and nothing else: no data
    // directory, no archive, no lock. This is the path that made a new host
    // impossible to add -- the lock is taken beside the archive, so it failed
    // with ENOENT for the lock while the missing thing was the directory.
    const archive = join(directory, 'share', 'conversations', 'archive.jsonl')
    const input = join(directory, 'export.jsonl')
    await writeConversationExport([createArchiveRecord('a')], input)

    const result = await importConversationExport({
      input,
      archive,
      apply: true,
    })

    assert.equal(result.ok, true)
    assert.equal(result.applied, true)
    assert.equal(result.added, 1)
    assert.match(await readFile(archive, 'utf8'), /"id":"a"/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('the write lock creates the archive directory before claiming it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-provisioning-lock-'))
  try {
    const archive = join(directory, 'absent', 'archive.jsonl')

    let held = false
    await withArchiveWriteLock(archive, () => {
      held = true
      return Promise.resolve()
    })

    assert.equal(held, true)
    // Durable data, so the directory is created private rather than inheriting
    // whatever umask the scheduler happened to run with.
    const mode = (await stat(join(directory, 'absent'))).mode & 0o777
    assert.equal(mode, 0o700)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
