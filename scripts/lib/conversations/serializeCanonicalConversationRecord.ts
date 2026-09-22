import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * One record, one line, the same bytes on every machine.
 *
 * Identity in this archive is a hash of these bytes, so key order cannot come
 * from whatever order a parser happened to produce: two hosts that captured
 * the same conversation must agree byte for byte or they will publish it
 * twice. The order below is the declared interface order, and an absent
 * optional is omitted rather than emitted as null.
 *
 * The result contains no character any reader will mistake for a line break.
 * JSON escapes the control characters, but not U+2028 and U+2029, and Node's
 * readline terminates a line on both. Measured on the v1 archive: 1,690 and 3
 * of them, which turned 30,741 records into 32,434 lines and left 1,634
 * unparseable for a reader that used readline. Escaping them here means the
 * format is safe for every reader rather than only for one that remembers the
 * rule -- a trap documented is a trap every future consumer still walks into.
 */
export const serializeCanonicalConversationRecord = (
  record: ConversationRecord,
) =>
  JSON.stringify({
    schemaVersion: record.schemaVersion,
    id: record.id,
    source: record.source,
    sourceId: record.sourceId,
    title: record.title,
    events: record.events.map((event: ConversationEvent) => ({
      id: event.id,
      kind: event.kind,
      role: event.role,
      text: event.text,
      ...(event.timestamp === undefined ? {} : { timestamp: event.timestamp }),
    })),
    provenance: {
      contentSha256: record.provenance.contentSha256,
      relativePath: record.provenance.relativePath,
      redactions: record.provenance.redactions,
    },
    ...(record.startedAt === undefined ? {} : { startedAt: record.startedAt }),
    ...(record.updatedAt === undefined ? {} : { updatedAt: record.updatedAt }),
    ...(record.workspace === undefined ? {} : { workspace: record.workspace }),
  })
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
