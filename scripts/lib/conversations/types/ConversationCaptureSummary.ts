import type { ConversationSourceStatus } from './ConversationSourceStatus'

export interface ConversationCaptureSummary {
  ok: boolean
  sources: ConversationSourceStatus[]
  skipped: string[]
}
