import { serializeLegacyConversationRecord } from './serializeLegacyConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'

export const serializeConversationRecords = (records: ConversationRecord[]) =>
  records
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map(serializeLegacyConversationRecord)
    .join('\n') + (records.length === 0 ? '' : '\n')
