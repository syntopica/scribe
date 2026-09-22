import type { ConversationSource } from './ConversationSource'

export interface ConversationSourceStatus {
  source: ConversationSource
  available: boolean
  artifacts: number
  files: number
  databases: number
  skipped: number
  reason?: string
}
