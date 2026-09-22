import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'
import type { ConversationRecord } from './types/ConversationRecord'

export const upsertConversationRecordFragment = (
  records: Map<string, ConversationRecord>,
  record: ConversationRecord,
) => {
  const existing = records.get(record.id)
  records.set(
    record.id,
    existing === undefined
      ? record
      : mergeConversationRecordFragments(existing, record),
  )
}
