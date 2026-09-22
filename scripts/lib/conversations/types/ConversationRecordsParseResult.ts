import type { ConversationRecord } from './ConversationRecord'

export interface ConversationRecordsParseResult {
  records: ConversationRecord[]
  errors: string[]
}
