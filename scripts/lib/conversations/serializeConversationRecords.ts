import type { ConversationRecord } from './types/ConversationRecord'

export const serializeConversationRecords = (records: ConversationRecord[]) =>
  records
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((record) => JSON.stringify(record))
    .join('\n') + (records.length === 0 ? '' : '\n')
