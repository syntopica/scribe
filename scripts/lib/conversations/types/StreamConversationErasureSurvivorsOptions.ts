import type { ConversationArchiveGeneration } from './ConversationArchiveGeneration'

/** The generation to stream, what to drop, and where to account for both. */
export interface StreamConversationErasureSurvivorsOptions {
  segmentsDirectory: string
  segmentSha256: readonly string[]
  generation: ConversationArchiveGeneration
  removing: ReadonlySet<string>
  kept: Set<string>
  removed: Set<string>
}
