import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { qualifyConversationEventIds } from './qualifyConversationEventIds'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Brings a version 1 record onto the current schema. The upgrade is exact, not
 * a re-capture: a version 2 id is defined as the hash of the conversation id
 * and the version 1 id, so the same events come out with the ids a fresh
 * capture would give them. That is what lets an archive hold both versions
 * safely - the alternative, letting the newer capture supersede the older
 * record, would drop events whose source file has since been rotated away.
 */
export const upgradeConversationRecord = (
  record: ConversationRecord,
): ConversationRecord =>
  record.schemaVersion === CONVERSATION_SCHEMA_VERSION
    ? record
    : {
        ...record,
        schemaVersion: CONVERSATION_SCHEMA_VERSION,
        events: qualifyConversationEventIds(record.events, record.id),
      }
