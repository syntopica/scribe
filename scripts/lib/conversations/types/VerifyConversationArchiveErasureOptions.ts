import type { ConversationErasurePlan } from './ConversationErasurePlan'

/** The plan an erasure applied and the generation it produced. */
export interface VerifyConversationArchiveErasureOptions {
  root: string
  plan: ConversationErasurePlan
  generationId: string
}
