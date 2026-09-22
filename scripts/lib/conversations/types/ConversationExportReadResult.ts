import type { ConversationExportManifest } from './ConversationExportManifest'
import type { ConversationRecord } from './ConversationRecord'

export interface ConversationExportReadResult {
  records: ConversationRecord[]
  errors: string[]
  manifest?: ConversationExportManifest
}
