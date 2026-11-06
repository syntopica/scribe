import type { ConversationArchiveGeneration } from './ConversationArchiveGeneration'
import type { ConversationFragmentEntry } from './ConversationFragmentEntry'

export interface CollectKnownSecretValuesOptions {
  segmentsDirectory: string
  segmentSha256: string[]
  generation: ConversationArchiveGeneration
  /** Which entries the redaction covers; values come from those alone. */
  includes: (entry: ConversationFragmentEntry) => boolean
}
