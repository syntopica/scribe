import type { ConversationExportManifest } from './ConversationExportManifest'

export interface ConversationExportStreamResult {
  records: number
  errors: string[]
  manifest?: ConversationExportManifest
}
