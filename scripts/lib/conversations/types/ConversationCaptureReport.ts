import type { ConversationRecord } from './ConversationRecord'
import type { ConversationSourceStatus } from './ConversationSourceStatus'

export interface ConversationCaptureReport {
  ok: boolean
  records: ConversationRecord[]
  sources: ConversationSourceStatus[]
  skipped: string[]
}
