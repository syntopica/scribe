import { chmodSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { hashText } from './hashText'
import { materializeConversationFragmentSet } from './materializeConversationFragmentSet'
import { mergeConversationHosts } from './mergeConversationHosts'
import type { ConversationArtifactFingerprint } from './types/ConversationArtifactFingerprint'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Everything derived from the segments, in one file that may be deleted.
 *
 * Nothing here is canonical. The segments are, and this database exists only
 * so that a capture does not have to re-read four gigabytes to answer "have I
 * already published this?". Every field can be rebuilt by replaying segments,
 * so on any doubt -- schema mismatch, wrong generation, failed integrity check
 * -- the caller throws the file away instead of repairing it.
 *
 * It holds four things: which segments have been ingested, every fragment they
 * contain, the materialized record per conversation, and the source-artifact
 * fingerprints that let an unchanged file be skipped without opening it. The
 * pending table is the fifth: which conversations Atrium has not been handed
 * yet, so a failed refresh redelivers exactly those rather than everything.
 */
export class ConversationArchiveState {
  readonly #database: DatabaseSync

  constructor(path: string) {
    this.#database = new DatabaseSync(path)
    chmodSync(path, 0o600)
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS meta(
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS segments(
        sha256 TEXT PRIMARY KEY,
        entry_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS fragments(
        fragment_sha256 TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        record_json TEXT NOT NULL,
        segment_sha256 TEXT NOT NULL,
        hosts_json TEXT NOT NULL DEFAULT '[]'
      ) STRICT;
      CREATE INDEX IF NOT EXISTS fragments_by_conversation
        ON fragments(conversation_id);
      CREATE TABLE IF NOT EXISTS conversations(
        id TEXT PRIMARY KEY,
        record_json TEXT NOT NULL,
        conflicts INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS artifacts(
        source TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        storage_kind TEXT NOT NULL,
        generation_id TEXT NOT NULL,
        fingerprint_json TEXT NOT NULL,
        capture_versions TEXT NOT NULL,
        fragment_hashes TEXT NOT NULL,
        PRIMARY KEY(source, relative_path, storage_kind)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS pending_deliveries(
        conversation_id TEXT PRIMARY KEY
      ) STRICT;
    `)
  }

  meta(key: string) {
    const row = this.#database
      .prepare('SELECT value FROM meta WHERE key = ?')
      .get(key)
    return typeof row?.['value'] === 'string' ? row['value'] : undefined
  }

  setMeta(key: string, value: string) {
    this.#database
      .prepare(
        'INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value)
  }

  hasSegment(sha256: string) {
    return (
      this.#database
        .prepare('SELECT 1 AS present FROM segments WHERE sha256 = ?')
        .get(sha256) !== undefined
    )
  }

  segmentDigest() {
    const statement = this.#database.prepare(
      'SELECT sha256 FROM segments ORDER BY sha256',
    )
    return hashText(
      [...statement.iterate()].map((row) => String(row['sha256'])).join('\n'),
    )
  }

  hasFragment(fragmentSha256: string) {
    return (
      this.#database
        .prepare('SELECT 1 AS present FROM fragments WHERE fragment_sha256 = ?')
        .get(fragmentSha256) !== undefined
    )
  }

  /**
   * Record one segment's entries and report which conversations moved.
   *
   * Only the named conversations are rematerialized afterwards. A segment that
   * carries one changed conversation must cost one reduction, not thirty
   * thousand; that is the difference between a refresh that finishes in
   * seconds and the 132-second full-corpus rewrite this format replaces.
   *
   * A fragment already held is not re-inserted, but the hosts its new entry
   * names are unioned into the row: that is how a second machine's reading of
   * known bytes reaches the materialized record without a second fragment.
   */
  addSegment(options: {
    sha256: string
    entries: ConversationFragmentEntry[]
    createdAt: string
  }) {
    const touched = new Set<string>()
    this.#database.exec('BEGIN')
    try {
      this.#database
        .prepare(
          'INSERT OR IGNORE INTO segments(sha256, entry_count, created_at) VALUES (?, ?, ?)',
        )
        .run(options.sha256, options.entries.length, options.createdAt)
      const insert = this.#database.prepare(
        'INSERT OR IGNORE INTO fragments(fragment_sha256, conversation_id, record_json, segment_sha256, hosts_json) VALUES (?, ?, ?, ?, ?)',
      )
      const observe = this.#database.prepare(
        'UPDATE fragments SET hosts_json = ? WHERE fragment_sha256 = ?',
      )
      for (const entry of options.entries) {
        const hosts = mergeConversationHosts(entry.hosts) ?? []
        const result = insert.run(
          entry.fragmentSha256,
          entry.conversationId,
          JSON.stringify(entry.record),
          options.sha256,
          JSON.stringify(hosts),
        )
        if (result.changes > 0) {
          touched.add(entry.conversationId)
          continue
        }
        const known = this.fragmentHosts(entry.fragmentSha256)
        const union = mergeConversationHosts(known, hosts) ?? []
        if (union.length === known.length) continue
        observe.run(JSON.stringify(union), entry.fragmentSha256)
        touched.add(entry.conversationId)
      }
      this.#database.exec('COMMIT')
    } catch (error) {
      this.#database.exec('ROLLBACK')
      throw error
    }
    return [...touched].toSorted((left, right) => left.localeCompare(right))
  }

  fragments(conversationId: string) {
    const statement = this.#database.prepare(
      'SELECT record_json, hosts_json FROM fragments WHERE conversation_id = ? ORDER BY fragment_sha256',
    )
    return [...statement.iterate(conversationId)].map((row) => {
      const record = JSON.parse(
        String(row['record_json']),
      ) as ConversationRecord
      const hosts = mergeConversationHosts(
        JSON.parse(String(row['hosts_json'])) as string[],
      )
      return hosts === undefined ? record : { ...record, hosts }
    })
  }

  /** The hosts recorded as having observed one fragment; empty when unknown. */
  fragmentHosts(fragmentSha256: string): string[] {
    const row = this.#database
      .prepare('SELECT hosts_json FROM fragments WHERE fragment_sha256 = ?')
      .get(fragmentSha256)
    return typeof row?.['hosts_json'] === 'string'
      ? (JSON.parse(row['hosts_json']) as string[])
      : []
  }

  materialize(conversationId: string) {
    const { record, conflicts } = materializeConversationFragmentSet(
      this.fragments(conversationId),
    )
    this.#database
      .prepare(
        'INSERT INTO conversations(id, record_json, conflicts) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET record_json = excluded.record_json, conflicts = excluded.conflicts',
      )
      .run(conversationId, JSON.stringify(record), conflicts.length)
    return { record, conflicts }
  }

  conversation(conversationId: string) {
    const row = this.#database
      .prepare('SELECT record_json FROM conversations WHERE id = ?')
      .get(conversationId)
    return typeof row?.['record_json'] === 'string'
      ? (JSON.parse(row['record_json']) as ConversationRecord)
      : undefined
  }

  *conversations() {
    const statement = this.#database.prepare(
      'SELECT record_json FROM conversations ORDER BY id',
    )
    for (const row of statement.iterate()) {
      yield JSON.parse(String(row['record_json'])) as ConversationRecord
    }
  }

  artifact(key: { source: string; relativePath: string; storageKind: string }) {
    const row = this.#database
      .prepare(
        'SELECT generation_id, fingerprint_json, capture_versions, fragment_hashes FROM artifacts WHERE source = ? AND relative_path = ? AND storage_kind = ?',
      )
      .get(key.source, key.relativePath, key.storageKind)
    if (row === undefined) return undefined
    return {
      generationId: String(row['generation_id']),
      fingerprint: JSON.parse(
        String(row['fingerprint_json']),
      ) as ConversationArtifactFingerprint,
      captureVersions: String(row['capture_versions']),
      fragmentHashes: String(row['fragment_hashes'])
        .split(',')
        .filter((hash) => hash.length > 0),
    }
  }

  putArtifact(row: {
    source: string
    relativePath: string
    storageKind: string
    generationId: string
    fingerprint: ConversationArtifactFingerprint
    captureVersions: string
    fragmentHashes: string[]
  }) {
    this.#database
      .prepare(
        'INSERT INTO artifacts(source, relative_path, storage_kind, generation_id, fingerprint_json, capture_versions, fragment_hashes) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source, relative_path, storage_kind) DO UPDATE SET generation_id = excluded.generation_id, fingerprint_json = excluded.fingerprint_json, capture_versions = excluded.capture_versions, fragment_hashes = excluded.fragment_hashes',
      )
      .run(
        row.source,
        row.relativePath,
        row.storageKind,
        row.generationId,
        JSON.stringify(row.fingerprint),
        row.captureVersions,
        row.fragmentHashes.join(','),
      )
  }

  /**
   * Forget an artifact that is no longer on disk, and nothing else.
   *
   * A source file disappearing is a cache fact, never an archive fact. The
   * archive exists precisely to outlive the tools that wrote it, so deletion
   * of a rollout must cost one row here and no fragment anywhere.
   */
  forgetArtifact(key: {
    source: string
    relativePath: string
    storageKind: string
  }) {
    this.#database
      .prepare(
        'DELETE FROM artifacts WHERE source = ? AND relative_path = ? AND storage_kind = ?',
      )
      .run(key.source, key.relativePath, key.storageKind)
  }

  artifactKeys() {
    const statement = this.#database.prepare(
      'SELECT source, relative_path, storage_kind FROM artifacts',
    )
    return [...statement.iterate()].map((row) => ({
      source: String(row['source']),
      relativePath: String(row['relative_path']),
      storageKind: String(row['storage_kind']),
    }))
  }

  markPending(conversationIds: string[]) {
    const insert = this.#database.prepare(
      'INSERT OR IGNORE INTO pending_deliveries(conversation_id) VALUES (?)',
    )
    for (const id of conversationIds) insert.run(id)
  }

  pendingDeliveries() {
    const statement = this.#database.prepare(
      'SELECT conversation_id FROM pending_deliveries ORDER BY conversation_id',
    )
    return [...statement.iterate()].map((row) => String(row['conversation_id']))
  }

  clearPendingDeliveries(conversationIds: string[]) {
    const remove = this.#database.prepare(
      'DELETE FROM pending_deliveries WHERE conversation_id = ?',
    )
    for (const id of conversationIds) remove.run(id)
  }

  counts() {
    const count = (table: string) => {
      const row = this.#database
        .prepare(`SELECT count(*) AS total FROM ${table}`)
        .get()
      return typeof row?.['total'] === 'number' ? row['total'] : 0
    }
    return {
      segments: count('segments'),
      fragments: count('fragments'),
      conversations: count('conversations'),
      artifacts: count('artifacts'),
      pending: count('pending_deliveries'),
    }
  }

  integrityCheck() {
    const row = this.#database.prepare('PRAGMA integrity_check').get()
    return Object.values(row ?? {}).at(0) === 'ok'
  }

  close() {
    this.#database.close()
  }
}
