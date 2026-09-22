import type { ConversationRecord } from './ConversationRecord'
import type { ConversationSource } from './ConversationSource'

export interface ConversationArtifactCapture {
  source: ConversationSource
  relativePath: string
  records: ConversationRecord[]
  error?: string
}
