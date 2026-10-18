import type { ConversationRecord } from './types/ConversationRecord'

/**
 * One record in the v1 wire form, where `provenance.relativePath` is the
 * entries joined with commas. The v1 archive, its transfer files and
 * `scribe export` keep that form until cutover: a peer still running the v1
 * reader rejects an array, and the export bytes stay what Atrium already
 * ingested. Key order is the record's own, so a v1 record read and written
 * back is the same bytes.
 */
export const serializeLegacyConversationRecord = (record: ConversationRecord) =>
  JSON.stringify({
    ...record,
    provenance: {
      ...record.provenance,
      relativePath: record.provenance.relativePath.join(','),
    },
  })
