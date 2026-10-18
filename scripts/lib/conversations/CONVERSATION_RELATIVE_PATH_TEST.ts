import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createConversationFragmentWithPaths as withPaths } from './fixtures/createConversationFragmentWithPaths'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { mergeRelativePathsAsAtHead } from './fixtures/mergeRelativePathsAsAtHead'
import { isConversationRecord } from './isConversationRecord'
import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'
import { migrateConversationArchiveToSegments } from './migrateConversationArchiveToSegments'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import { serializeConversationSegment } from './serializeConversationSegment'
import type { StoredConversationRecord } from './types/StoredConversationRecord'
import { validateConversationSegment } from './validators/validateConversationSegment'
import { validateConversationSegmentEntry } from './validators/validateConversationSegmentEntry'
import { writeConversationExport } from './writeConversationExport'

void test('a relativePath array round-trips through a segment, commas and all', () => {
  const paths = ['a.jsonl', 'dir/b,c.jsonl']
  const text = serializeConversationSegment({
    fragments: [withPaths(paths)],
    generationId: 'g',
    createdAt: '2026-10-18T00:00:00.000Z',
  })
  const { entries } = validateConversationSegment(text)
  assert.deepEqual(entries[0]?.record.provenance.relativePath, paths)
})

void test('v1 strings keep the v1 whole-string check; v2 arrays are checked per entry', () => {
  const cases: [string | string[], boolean][] = [
    [['a.jsonl', '/etc/x'], false],
    [['a.jsonl', '../b'], false],
    [[], false],
    // Accepted by v1 before arrays and still accepted, so the live refresh
    // reads every record it read before; migration re-checks each entry.
    ['a.jsonl,/etc/x', true],
    ['a.jsonl,../b', true],
    [',', true],
    ['../../credentials', false],
    ['/etc/x', false],
  ]
  for (const [relativePath, accepted] of cases) {
    const record = JSON.parse(
      JSON.stringify(withPaths(['a.jsonl'])),
    ) as StoredConversationRecord
    record.provenance.relativePath = relativePath
    assert.equal(isConversationRecord(record), accepted, String(relativePath))
  }
  for (const relativePath of [['a.jsonl', '/etc/x'], ['../b'], []]) {
    const text = serializeConversationSegment({
      fragments: [withPaths(relativePath)],
      generationId: 'g',
      createdAt: '2026-10-18T00:00:00.000Z',
    })
    assert.throws(
      () => validateConversationSegment(text),
      /unsafe or empty relativePath/,
    )
  }
})

void test('a segment written before the array change says to re-migrate', () => {
  const record = JSON.parse(
    JSON.stringify(withPaths(['a.jsonl'])),
  ) as StoredConversationRecord
  record.provenance.relativePath = 'a.jsonl'
  assert.throws(
    () =>
      validateConversationSegmentEntry(
        {
          kind: 'conversation-fragment',
          conversationId: record.id,
          fragmentSha256: 'old',
          record,
        },
        2,
      ),
    /must be re-migrated from the v1 archive/,
  )
})

void test('the v1 merge joins to the same bytes as before arrays, edge cases included', () => {
  const cases: [string[], string[]][] = [
    // "a.jsonl," read from v1, merged with a fresh capture of "a.jsonl".
    [['a.jsonl', ''], ['a.jsonl']],
    // A captured filename carrying a comma, against its overlapping split.
    [['dir/a,b.jsonl'], ['dir/a', 'b.jsonl']],
    [
      ['b.jsonl', 'a.jsonl', 'b.jsonl'],
      ['c.jsonl', ''],
    ],
    [[''], ['x.jsonl']],
  ]
  for (const [left, right] of cases) {
    const merged = mergeConversationRecordFragments(
      {
        ...withPaths(left),
        provenance: { ...withPaths(left).provenance, contentSha256: 'l' },
      },
      {
        ...withPaths(right),
        provenance: { ...withPaths(right).provenance, contentSha256: 'r' },
      },
    )
    assert.equal(
      merged.provenance.relativePath.join(','),
      mergeRelativePathsAsAtHead(left.join(','), right.join(',')),
      JSON.stringify([left, right]),
    )
  }
})

void test('migration drops unsafe or empty v1 entries, and refuses a record left with none', async (context) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-relative-path-unsafe-',
  )
  const kept = join(home, 'kept.jsonl')
  await writeConversationExport([withPaths(['a.jsonl', '../b', '', ''])], kept)
  const keptRoot = join(home, 'kept')
  await migrateConversationArchiveToSegments({
    archive: kept,
    root: keptRoot,
    createdAt: '2026-10-18T00:00:00.000Z',
  })
  const { generation, segments } =
    await readConversationArchiveGeneration(keptRoot)
  const read = await Promise.all(
    generation.baseSegmentSha256.map(async (sha256) =>
      readConversationArchiveSegment({
        segmentsDirectory: segments,
        sha256,
        generation,
      }),
    ),
  )
  assert.deepEqual(
    read.flatMap(({ entries }) =>
      entries.map((entry) => entry.record.provenance.relativePath),
    ),
    [['a.jsonl']],
  )

  const refused = join(home, 'refused.jsonl')
  await writeConversationExport([withPaths(['', '/etc/x'])], refused)
  await assert.rejects(
    migrateConversationArchiveToSegments({
      archive: refused,
      root: join(home, 'refused'),
      createdAt: '2026-10-18T00:00:00.000Z',
    }),
    /has no safe relativePath entry and cannot be migrated/,
  )
})

void test('a v1 comma-joined relativePath migrates to the split, sorted array', async (context) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-relative-path-',
  )
  const archive = join(home, 'archive.jsonl')
  // The v1 writer keeps the joined form on disk.
  await writeConversationExport(
    [withPaths(['b.jsonl', 'a.jsonl', 'b.jsonl'])],
    archive,
  )
  assert.match(
    await fs.readFile(archive, 'utf8'),
    /"relativePath":"b\.jsonl,a\.jsonl,b\.jsonl"/,
  )

  const root = join(home, 'v2')
  await migrateConversationArchiveToSegments({
    archive,
    root,
    createdAt: '2026-10-18T00:00:00.000Z',
  })
  const { generation, segments } = await readConversationArchiveGeneration(root)
  const records = await Promise.all(
    generation.baseSegmentSha256.map(async (sha256) =>
      readConversationArchiveSegment({
        segmentsDirectory: segments,
        sha256,
        generation,
      }),
    ),
  )
  assert.deepEqual(
    records.flatMap(({ entries }) =>
      entries.map((entry) => entry.record.provenance.relativePath),
    ),
    [['a.jsonl', 'b.jsonl']],
  )
})
