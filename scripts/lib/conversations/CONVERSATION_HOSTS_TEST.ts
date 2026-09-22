import assert from 'node:assert/strict'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { conversationHostLabel } from './conversationHostLabel'
import { exportConversations } from './exportConversations'
import { CONVERSATION_CAPTURE_FIXTURE_SOURCES } from './fixtures/CONVERSATION_CAPTURE_FIXTURE_SOURCES'
import { createConversationCaptureInstallation } from './fixtures/createConversationCaptureInstallation'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { readStoredConversationRecords as stored } from './fixtures/readStoredConversationRecords'
import { seedConversationSegmentArchive } from './fixtures/seedConversationSegmentArchive'
import { writeClaudeConversationArtifact } from './fixtures/writeClaudeConversationArtifact'
import { hashConversationFragment } from './hashConversationFragment'
import { materializeConversationFragmentSet } from './materializeConversationFragmentSet'
import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'
import { migrateConversationArchiveToSegments } from './migrateConversationArchiveToSegments'
import { openConversationArchiveState } from './openConversationArchiveState'
import { publishConversationCapture } from './publishConversationCapture'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationExport } from './readConversationExport'
import { validateConversationSegment } from './validators/validateConversationSegment'
import { writeConversationExport } from './writeConversationExport'

void test('the host label is the configured name, else the short hostname', () => {
  assert.equal(
    conversationHostLabel({ ROCKET_AGENTS_HOST: ' peer-a ' }),
    'peer-a',
  )
  const fallback = conversationHostLabel({})
  assert.equal(fallback, fallback.toLowerCase())
  assert.equal(fallback.includes('.'), false)
  assert.equal(fallback.length > 0, true)
})

void test('hosts sit outside the fragment identity and union commutatively', () => {
  const bare = createConversationFragment({ id: 'c', events: 2 })
  const here = { ...bare, hosts: ['macbook'] }
  const there = { ...bare, hosts: ['peer-a'] }
  assert.equal(hashConversationFragment(here), hashConversationFragment(bare))
  assert.equal(hashConversationFragment(there), hashConversationFragment(bare))

  const longer = {
    ...createConversationFragment({ id: 'c', events: 3 }),
    hosts: ['peer-a'],
  }
  assert.deepEqual(mergeConversationRecordFragments(here, longer).hosts, [
    'macbook',
    'peer-a',
  ])
  assert.deepEqual(mergeConversationRecordFragments(longer, here).hosts, [
    'macbook',
    'peer-a',
  ])
  assert.equal('hosts' in mergeConversationRecordFragments(bare, bare), false)

  const set = materializeConversationFragmentSet([there, longer, here])
  assert.deepEqual(set.record.hosts, ['macbook', 'peer-a'])
  // Identical bytes from two machines collapse to one fragment and keep both
  // observations, whichever arrived last.
  assert.deepEqual(
    materializeConversationFragmentSet([here, there]).record.hosts,
    ['macbook', 'peer-a'],
  )
  assert.deepEqual(
    materializeConversationFragmentSet([there, here]).record.hosts,
    ['macbook', 'peer-a'],
  )
  assert.equal(
    'hosts' in materializeConversationFragmentSet([bare]).record,
    false,
  )
})

void test('the same bytes from a second machine cost one update, then nothing', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-hosts-store-',
  )
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  try {
    const bare = createConversationFragment({ id: 'c', events: 2 })
    assert.equal(store.mergeFragment(bare), 'added')
    assert.equal(store.mergeFragment(bare), 'duplicate')
    const before = stored(store)[0]
    assert.equal('hosts' in (before ?? {}), false)

    assert.equal(store.mergeFragment({ ...bare, hosts: ['peer-a'] }), 'updated')
    assert.deepEqual(stored(store)[0]?.hosts, ['peer-a'])
    assert.equal(
      store.mergeFragment({ ...bare, hosts: ['peer-a'] }),
      'duplicate',
    )
    assert.equal(
      store.mergeFragment({ ...bare, hosts: ['macbook'] }),
      'updated',
    )
    assert.deepEqual(stored(store)[0]?.hosts, ['macbook', 'peer-a'])
    assert.equal(store.mergeFragment(bare), 'duplicate')
    assert.equal(store.count(), 1)
  } finally {
    store.close()
  }
})

void test('a capture stamps the host that read the artifact, and an export keeps it', async (context) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-hosts-capture-',
  )
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 2 })
  const archive = join(home, 'archive.jsonl')
  await exportConversations(
    home,
    archive,
    CONVERSATION_CAPTURE_FIXTURE_SOURCES,
    false,
    'macbook',
  )
  const { records, errors } = await readConversationExport(archive)
  assert.deepEqual(errors, [])
  assert.deepEqual(
    records.map((record) => record.hosts),
    [['macbook']],
  )
})

void test('one record given twice under two hosts is one segment entry naming both', () => {
  const bare = createConversationFragment({ id: 'c', events: 2 })
  const text = createConversationSegment([
    { ...bare, hosts: ['peer-a'] },
    { ...bare, hosts: ['macbook'] },
  ])
  const { entries } = validateConversationSegment(text)
  assert.equal(entries.length, 1)
  assert.deepEqual(entries[0]?.hosts, ['macbook', 'peer-a'])
  const [entry] = entries
  assert.ok(entry)
  assert.equal('hosts' in entry.record, false)
  assert.equal(createConversationSegment([bare]).includes('hosts'), false)
})

void test('a second machine reading known bytes publishes its host, not a second fragment', async (context) => {
  const { home, root } = await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  const capture = async (host: string, createdAt: string) =>
    publishConversationCapture({
      home,
      root,
      statePath: join(home, `state-${host}.sqlite3`),
      sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
      createdAt,
      host,
    })

  const first = await capture('macbook', '2026-09-01T09:00:00.000Z')
  assert.equal(first.metrics.fragmentsAppended, 1)
  const second = await capture('peer-a', '2026-09-01T10:00:00.000Z')
  assert.equal(second.segments.length, 1)
  assert.equal(second.counts.fragments, 1)
  assert.equal(second.conversationsChanged, 1)
  const again = await capture('peer-a', '2026-09-01T11:00:00.000Z')
  assert.equal(again.metrics.cacheHits, 1)
  assert.deepEqual(again.segments, [])

  const { generation, segments } = await readConversationArchiveGeneration(root)
  const { state } = await openConversationArchiveState({
    statePath: join(home, 'state-reader.sqlite3'),
    generation,
    segmentsDirectory: segments,
  })
  try {
    const [record] = [...state.conversations()]
    assert.deepEqual(record?.hosts, ['macbook', 'peer-a'])
    assert.equal(state.counts().fragments, 1)
  } finally {
    state.close()
  }
})

void test('replaying segments that name different hosts unions them on the record', async (context) => {
  const bare = createConversationFragment({ id: 'c1', events: 3 })
  const seeded = await seedConversationSegmentArchive(context, [
    { ...bare, hosts: ['macbook'] },
  ])
  const { state } = await openConversationArchiveState({
    statePath: seeded.statePath,
    generation: seeded.generation,
    segmentsDirectory: seeded.segments,
  })
  try {
    assert.deepEqual(state.conversation('c1')?.hosts, ['macbook'])
    const text = createConversationSegment(
      [{ ...bare, hosts: ['peer-a'] }],
      seeded.generation.generationId,
    )
    const touched = state.addSegment({
      sha256: 'host-only',
      entries: validateConversationSegment(text).entries,
      createdAt: '2026-09-01T10:00:00.000Z',
    })
    assert.deepEqual(touched, ['c1'])
    state.materialize('c1')
    assert.deepEqual(state.conversation('c1')?.hosts, ['macbook', 'peer-a'])
    assert.deepEqual(state.fragmentHosts(hashConversationFragment(bare)), [
      'macbook',
      'peer-a',
    ])
    assert.equal(state.counts().fragments, 1)
  } finally {
    state.close()
  }
})

void test('a v1 archive carries its hosts through the segment migration', async (context) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-hosts-migration-',
  )
  const archive = join(home, 'archive.jsonl')
  await writeConversationExport(
    [
      {
        ...createConversationFragment({ id: 'a', events: 2 }),
        hosts: ['macbook', 'peer-a'],
      },
      createConversationFragment({ id: 'b', events: 2 }),
    ],
    archive,
  )
  const root = join(home, 'segments')
  await migrateConversationArchiveToSegments({
    archive,
    root,
    createdAt: '2026-09-01T09:00:00.000Z',
    buckets: 1,
  })
  const { generation, segments } = await readConversationArchiveGeneration(root)
  const { state } = await openConversationArchiveState({
    statePath: join(home, 'state.sqlite3'),
    generation,
    segmentsDirectory: segments,
  })
  try {
    assert.deepEqual(state.conversation('a')?.hosts, ['macbook', 'peer-a'])
    assert.equal('hosts' in (state.conversation('b') ?? {}), false)
  } finally {
    state.close()
  }
})

void test('renaming the host invalidates the capture cache once, so the new name is observed', async (context) => {
  const { home, root, statePath } =
    await createConversationCaptureInstallation(context)
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 4 })
  const capture = async (host: string, createdAt: string) =>
    publishConversationCapture({
      home,
      root,
      statePath,
      sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
      createdAt,
      host,
    })
  await capture('old-name', '2026-09-01T09:00:00.000Z')
  const renamed = await capture('new-name', '2026-09-01T10:00:00.000Z')
  assert.equal(renamed.metrics.cacheHits, 0)
  assert.equal(renamed.segments.length, 1)
  assert.equal(renamed.counts.fragments, 1)
  const settled = await capture('new-name', '2026-09-01T11:00:00.000Z')
  assert.equal(settled.metrics.cacheHits, 1)
  assert.deepEqual(settled.segments, [])

  const { generation, segments } = await readConversationArchiveGeneration(root)
  const { state } = await openConversationArchiveState({
    statePath: join(home, 'state-reader.sqlite3'),
    generation,
    segmentsDirectory: segments,
  })
  try {
    assert.deepEqual([...state.conversations()][0]?.hosts, [
      'new-name',
      'old-name',
    ])
  } finally {
    state.close()
  }
})

void test('two copies of one record naming different hosts migrate as one fragment naming both', async (context) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-hosts-migration-dup-',
  )
  const archive = join(home, 'archive.jsonl')
  const bare = createConversationFragment({ id: 'a', events: 2 })
  await writeConversationExport(
    [
      { ...bare, hosts: ['macbook'] },
      { ...bare, hosts: ['peer-a'] },
    ],
    archive,
  )
  const root = join(home, 'segments')
  const migrated = await migrateConversationArchiveToSegments({
    archive,
    root,
    createdAt: '2026-09-01T09:00:00.000Z',
    buckets: 1,
  })
  assert.equal(migrated.fragments, 1)
  assert.equal(migrated.duplicates, 1)
  const { generation, segments } = await readConversationArchiveGeneration(root)
  const { state } = await openConversationArchiveState({
    statePath: join(home, 'state.sqlite3'),
    generation,
    segmentsDirectory: segments,
  })
  try {
    assert.equal(state.counts().fragments, 1)
    assert.deepEqual(state.conversation('a')?.hosts, ['macbook', 'peer-a'])
  } finally {
    state.close()
  }
})

void test('a state file from an older schema is replaced even when it holds no segments', async (context) => {
  const seeded = await seedConversationSegmentArchive(context, [
    createConversationFragment({ id: 'c1', events: 2 }),
  ])
  // The schema-2 shape: no hosts column, nothing ingested, version stamped.
  const old = new DatabaseSync(seeded.statePath)
  old.exec(`
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE segments(sha256 TEXT PRIMARY KEY, entry_count INTEGER NOT NULL, created_at TEXT NOT NULL) STRICT;
    CREATE TABLE fragments(fragment_sha256 TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, record_json TEXT NOT NULL, segment_sha256 TEXT NOT NULL) STRICT;
    INSERT INTO meta(key, value) VALUES ('schemaVersion', '2');
  `)
  old.close()

  const { state, rebuilt, replayed } = await openConversationArchiveState({
    statePath: seeded.statePath,
    generation: seeded.generation,
    segmentsDirectory: seeded.segments,
  })
  try {
    assert.equal(rebuilt, false)
    assert.equal(replayed, 1)
    assert.equal(state.counts().fragments, 1)
    assert.equal(state.meta('schemaVersion'), '3')
  } finally {
    state.close()
  }
})
