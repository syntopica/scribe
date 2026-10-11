import type { ConversationRecord } from './ConversationRecord'

/** A fragment stream to seal as a new generation's chunked base. */
export interface SealConversationRecordsAsGenerationOptions {
  root: string
  records: AsyncIterable<ConversationRecord>
  createdAt: string
  buckets: number
  parentGenerationId?: string
}
