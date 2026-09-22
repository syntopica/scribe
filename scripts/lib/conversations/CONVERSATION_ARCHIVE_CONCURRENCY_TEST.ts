import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationArchiveChangedError } from './ConversationArchiveChangedError'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { createArchiveRecord } from './fixtures/createArchiveRecord'
import { importConversationExport } from './importConversationExport'
import { isArchiveLockAbandoned } from './isArchiveLockAbandoned'
import { loadConversationExportStore } from './loadConversationExportStore'
import { readArchiveRevision } from './readArchiveRevision'
import type { ConversationRecord } from './types/ConversationRecord'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeConversationExport } from './writeConversationExport'
import { writeConversationExportFromStore } from './writeConversationExportFromStore'

void test('an import refuses to publish over an archive that moved under it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-concurrency-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    const first = join(directory, 'first.jsonl')
    const second = join(directory, 'second.jsonl')
    await writeConversationExport([createArchiveRecord('a')], archive)
    await writeConversationExport([createArchiveRecord('b')], first)
    await writeConversationExport([createArchiveRecord('c')], second)

    // Stand in for the other writer: it lands while this import is merging,
    // which is exactly the window a long merge leaves open.
    const before = await readArchiveRevision(archive)
    await importConversationExport({ input: second, archive, apply: true })
    assert.notEqual(await readArchiveRevision(archive), before)

    // The import that merged from the older revision must not publish, and
    // must not have removed the conversation the other writer added.
    // Reproduce a merge that began before the archive changed.
    await assert.rejects(
      withArchiveWriteLock(archive, async () => {
        if ((await readArchiveRevision(archive)) !== before)
          throw new ConversationArchiveChangedError(archive)
      }),
      /changed while it was being merged/,
    )
    const after = await importConversationExport({
      input: first,
      archive,
      apply: false,
    })
    assert.equal(after.total, 3)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('the publication lock is released even when publication fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-lock-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    await assert.rejects(
      withArchiveWriteLock(archive, () => Promise.reject(new Error('boom'))),
      /boom/,
    )
    // A lock left behind would block every later import until it went stale.
    assert.equal(
      await withArchiveWriteLock(archive, () => Promise.resolve(1)),
      1,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('exchanging two revisions of one conversation loses neither side', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-merge-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    const remote = join(directory, 'remote.jsonl')
    const mine: ConversationRecord = {
      ...createArchiveRecord('shared'),
      events: [
        { id: 'e1', kind: 'message', role: 'user', text: 'one' },
        { id: 'e2', kind: 'message', role: 'assistant', text: 'only mine' },
      ],
      provenance: { contentSha256: 'mine', relativePath: 'a', redactions: 0 },
    }
    const theirs: ConversationRecord = {
      ...createArchiveRecord('shared'),
      events: [
        { id: 'e1', kind: 'message', role: 'user', text: 'one' },
        { id: 'e3', kind: 'message', role: 'assistant', text: 'only theirs' },
      ],
      provenance: { contentSha256: 'theirs', relativePath: 'b', redactions: 0 },
    }
    await writeConversationExport([mine], archive)
    await writeConversationExport([theirs], remote)

    const result = await importConversationExport({
      input: remote,
      archive,
      apply: true,
    })
    assert.equal(result.updated, 1)

    const lines = (await readFile(archive, 'utf8')).trim().split('\n')
    const merged = JSON.parse(lines[1] ?? '{}') as ConversationRecord
    assert.deepEqual(
      merged.events
        .map((event) => event.id)
        .toSorted((a, b) => a.localeCompare(b)),
      ['e1', 'e2', 'e3'],
      'the event only this host had must survive the import',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('a lock whose holder is still running is not reclaimed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-lock-live-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    const lock = `${archive}.write-lock`
    // This process is the holder, and it is plainly alive.
    await writeFile(lock, `${String(process.pid)}\n`)
    assert.equal(await isArchiveLockAbandoned(lock), false)

    // The publication section runs for tens of minutes, so a waiter must sit
    // through it rather than declaring the lock stale and writing too. Age is
    // no longer the test: this lock is instantly older than the one-minute
    // window the previous version reclaimed at.
    process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS'] = '750'
    try {
      await assert.rejects(
        withArchiveWriteLock(archive, () => Promise.resolve(1)),
        /timed out waiting for/,
      )
    } finally {
      delete process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS']
    }
    // Refusing to steal the lock must not remove it either.
    assert.equal((await readFile(lock, 'utf8')).trim(), String(process.pid))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('a lock left behind by a dead holder is reclaimed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-lock-dead-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    const lock = `${archive}.write-lock`
    // A real pid that has already exited, which is what a writer killed
    // mid-publication leaves behind.
    const dead = spawnSync(process.execPath, ['-e', '']).pid
    assert.ok(dead > 0)
    await writeFile(lock, `${String(dead)}\n`)
    assert.equal(await isArchiveLockAbandoned(lock), true)
    assert.equal(
      await withArchiveWriteLock(archive, () => Promise.resolve(7)),
      7,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('a lock file nothing can be read from is treated as held', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-lock-garbage-'))
  try {
    const lock = join(directory, 'archive.jsonl.write-lock')
    // Truncated, or written by a version that recorded no pid. Guessing
    // "abandoned" here would authorise a second concurrent writer, so the
    // conservative reading is the only safe one.
    await writeFile(lock, '')
    assert.equal(await isArchiveLockAbandoned(lock), false)
    await writeFile(lock, 'not-a-pid\n')
    assert.equal(await isArchiveLockAbandoned(lock), false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('a publication refuses to rename over an archive that moved mid-write', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archive-late-write-'))
  try {
    const archive = join(directory, 'archive.jsonl')
    const incoming = join(directory, 'incoming.jsonl')
    await writeConversationExport([createArchiveRecord('a')], archive)
    await writeConversationExport([createArchiveRecord('b')], incoming)

    // Serializing the replacement takes as long as the merge, so the other
    // writer's rename lands after this import's pre-flight check and before
    // its own rename. Only the second check sees it.
    const store = new ConversationCaptureStore(
      join(directory, 'capture.sqlite'),
    )
    try {
      await loadConversationExportStore(incoming, store)
      const mergedFrom = await readArchiveRevision(archive)
      await assert.rejects(
        writeConversationExportFromStore(
          store,
          archive,
          new Date(),
          [],
          async () => {
            await writeConversationExport([createArchiveRecord('c')], archive)
            if ((await readArchiveRevision(archive)) !== mergedFrom)
              throw new ConversationArchiveChangedError(archive)
          },
        ),
        /changed while it was being merged/,
      )
    } finally {
      store.close()
    }

    // The other writer's archive must be the one still on disk, and no
    // temporary file may be left beside it.
    const lines = (await readFile(archive, 'utf8')).trim().split('\n')
    assert.equal(lines.length, 2)
    assert.match(lines[1] ?? '', /"c"/)
    assert.deepEqual(
      (await readdir(directory)).filter((entry) => entry.includes('.tmp-')),
      [],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
