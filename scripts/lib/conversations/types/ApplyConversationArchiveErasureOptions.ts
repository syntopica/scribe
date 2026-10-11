import type { ConversationErasurePlan } from './ConversationErasurePlan'

/** A reviewed erasure plan and the archive it is to be applied to. */
export interface ApplyConversationArchiveErasureOptions {
  root: string
  plan: ConversationErasurePlan
  createdAt: string
  buckets?: number
}
