import type { ConversationArchiveGeneration } from './ConversationArchiveGeneration'

/** One staged file, the active segments directory, and the generation it must satisfy. */
export interface ReceiveStagedConversationSegmentOptions {
  stagingDirectory: string
  name: string
  segmentsDirectory: string
  generation: ConversationArchiveGeneration
}
