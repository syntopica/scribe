import type { ConversationSegmentStateOptions } from './ConversationSegmentStateOptions'

/** A segment archive, its state, and the slice Atrium has ingested. */
export interface AcknowledgeConversationSliceOptions extends ConversationSegmentStateOptions {
  slice: string
}
