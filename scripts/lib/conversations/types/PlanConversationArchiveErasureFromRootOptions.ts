import type { ConversationErasurePlan } from './ConversationErasurePlan'

/** An archive on disk and what to plan away from its current generation. */
export interface PlanConversationArchiveErasureFromRootOptions {
  root: string
  createdAt: string
  reason: ConversationErasurePlan['reason']
  removeFragmentSha256?: readonly string[]
  removeConversationIds?: readonly string[]
}
