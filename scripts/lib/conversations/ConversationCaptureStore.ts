import { chmodSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { conversationMergeAddedNothing } from './conversationMergeAddedNothing'
import { mergeConversationHosts } from './mergeConversationHosts'
import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationStoreChange } from './types/ConversationStoreChange'
import { upgradeConversationRecord } from './upgradeConversationRecord'

export class ConversationCaptureStore {
  readonly #database: DatabaseSync
  readonly #find
  readonly #upsert

  constructor(path: string) {
    this.#database = new DatabaseSync(path)
    chmodSync(path, 0o600)
    this.#database.exec(
      'CREATE TABLE records(id TEXT PRIMARY KEY, record_json TEXT NOT NULL, redactions INTEGER NOT NULL, schema_version INTEGER NOT NULL) STRICT',
    )
    this.#find = this.#database.prepare(
      'SELECT record_json FROM records WHERE id = ?',
    )
    this.#upsert = this.#database.prepare(
      'INSERT INTO records(id, record_json, redactions, schema_version) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET record_json = excluded.record_json, redactions = excluded.redactions, schema_version = excluded.schema_version',
    )
  }

  mergeFragment(record: ConversationRecord): ConversationStoreChange {
    const existing = this.#find.get(record.id)
    if (existing === undefined || typeof existing['record_json'] !== 'string') {
      this.#upsert.run(
        record.id,
        JSON.stringify(record),
        record.provenance.redactions,
        record.schemaVersion,
      )
      return 'added'
    }
    const current = JSON.parse(existing['record_json']) as ConversationRecord
    if (current.provenance.contentSha256 === record.provenance.contentSha256) {
      // Same bytes, so nothing about the conversation moves - but a second
      // machine reading them is worth one write, or the archive would never
      // learn that the mini holds what the MacBook captured.
      const hosts = mergeConversationHosts(current.hosts, record.hosts)
      if (JSON.stringify(hosts ?? []) === JSON.stringify(current.hosts ?? []))
        return 'duplicate'
      const observed = { ...current, ...(hosts === undefined ? {} : { hosts }) }
      this.#upsert.run(
        observed.id,
        JSON.stringify(observed),
        observed.provenance.redactions,
        observed.schemaVersion,
      )
      return 'updated'
    }
    const merged = mergeConversationRecordFragments(current, record)
    if (conversationMergeAddedNothing(current, merged)) return 'duplicate'
    this.#upsert.run(
      merged.id,
      JSON.stringify(merged),
      merged.provenance.redactions,
      merged.schemaVersion,
    )
    return 'updated'
  }

  /**
   * Overwrite rather than merge. Kept for a caller that genuinely knows the
   * incoming record supersedes the stored one; merging is what an exchange
   * between two archives needs, because there neither side supersedes the
   * other and the later arrival is not the better one.
   */
  replace(record: ConversationRecord): ConversationStoreChange {
    const existing = this.#find.get(record.id)
    if (existing === undefined || typeof existing['record_json'] !== 'string') {
      this.#upsert.run(
        record.id,
        JSON.stringify(record),
        record.provenance.redactions,
        record.schemaVersion,
      )
      return 'added'
    }
    const current = JSON.parse(existing['record_json']) as ConversationRecord
    if (current.provenance.contentSha256 === record.provenance.contentSha256)
      return 'duplicate'
    this.#upsert.run(
      record.id,
      JSON.stringify(record),
      record.provenance.redactions,
      record.schemaVersion,
    )
    return 'updated'
  }

  /**
   * Upgraded on the way out, so a reader never meets a record older than the
   * manifest that introduces it. The export manifest carries the current
   * schema version by construction; leaving stored records at version 1 made
   * the header lie about them, which is exactly how a consumer ends up
   * assuming qualified event ids that are not there. A record already at the
   * current version is yielded as it was stored, byte for byte, so its
   * serialization - and the export hash over it - does not move.
   */
  *serializedRecords() {
    const statement = this.#database.prepare(
      'SELECT record_json, schema_version FROM records ORDER BY id',
    )
    for (const row of statement.iterate()) {
      if (typeof row['record_json'] !== 'string') continue
      // The version is a column, so the common case costs a comparison rather
      // than a parse. A publication walks this twice -- once to hash the
      // manifest, once to write the body -- and parsing every record on both
      // passes is what made a 6 GB archive take tens of minutes to publish
      // while holding the write lock. A record already at the current version
      // is passed through byte for byte, which is what the old code did too
      // after paying to discover it.
      if (row['schema_version'] === CONVERSATION_SCHEMA_VERSION) {
        yield row['record_json']
        continue
      }
      const stored = JSON.parse(row['record_json']) as ConversationRecord
      const upgraded = upgradeConversationRecord(stored)
      yield upgraded === stored ? row['record_json'] : JSON.stringify(upgraded)
    }
  }

  count() {
    const row = this.#database
      .prepare('SELECT count(*) AS total FROM records')
      .get()
    return typeof row?.['total'] === 'number' ? row['total'] : 0
  }

  redactions() {
    const row = this.#database
      .prepare('SELECT coalesce(sum(redactions), 0) AS total FROM records')
      .get()
    return typeof row?.['total'] === 'number' ? row['total'] : 0
  }

  close() {
    this.#database.close()
  }
}
