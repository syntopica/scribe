import type { ConversationRecord } from '../types/ConversationRecord'
import { createArchiveRecord } from './createArchiveRecord'

/**
 * Five records with fixed bytes, so the bucket each fragment lands in is
 * fixed too.
 *
 * The captured fixture archive is not: its records hash a document that names
 * a random temporary home, so five fragments over four buckets all landed in
 * one bucket about once in 256 runs, and the migration test read that as a
 * base that had become a single object. The 2026-09-08 failure "under disk
 * contention" was this coincidence, not a timing assumption (Codex found the
 * single-bucket counterexample on 2026-09-09).
 */
export const createChunkedArchiveRecords = (): ConversationRecord[] =>
  ['s1', 's2', 's3', 's4', 's5'].map(createArchiveRecord)
