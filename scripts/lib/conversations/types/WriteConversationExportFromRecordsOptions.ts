import type { ConversationRecord } from './ConversationRecord'

/**
 * A record source that can be walked twice, where to write, and the clock.
 *
 * Twice because the manifest line comes first and carries the hash of every
 * line after it: one pass hashes, the second writes.
 */
export interface WriteConversationExportFromRecordsOptions {
  records: () => Iterable<ConversationRecord>
  output: string
  now: Date
}
