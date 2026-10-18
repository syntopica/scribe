/**
 * What `verify-segments` says about an archive, in the five numbers two
 * installations, or one installation before and after a drill, must share.
 */
export interface ConversationArchiveDigests {
  generationId: string
  segmentSet: string
  conversationIds: string
  eventSet: string
  materializedState: string
}
