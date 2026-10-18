import type { ConversationArchiveGeneration } from './ConversationArchiveGeneration'
import type { ConversationRecord } from './ConversationRecord'

/** The generation to stream, what to drop, and where to account for both. */
export interface StreamConversationErasureSurvivorsOptions {
  segmentsDirectory: string
  segmentSha256: readonly string[]
  generation: ConversationArchiveGeneration
  removing: ReadonlySet<string>
  kept: Set<string>
  removed: Set<string>
  /**
   * A redaction: each removed fragment is streamed again as this returns it,
   * and `replaced` maps its hash to the replacement's. An erasure passes none.
   */
  replace?: (record: ConversationRecord) => ConversationRecord
  replaced?: Map<string, string>
}
