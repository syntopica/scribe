import type { ConversationSegmentStateOptions } from './ConversationSegmentStateOptions'

/** A segment archive, its state, where to write the export, and the clock. */
export interface ExportConversationSegmentsOptions extends ConversationSegmentStateOptions {
  output: string
  now: Date
}
