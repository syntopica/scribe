import type { ConversationErasurePlan } from './ConversationErasurePlan'

/** An archive on disk and what to plan away from its current generation. */
export interface PlanConversationArchiveErasureFromRootOptions {
  root: string
  createdAt: string
  reason: ConversationErasurePlan['reason']
  removeFragmentSha256?: readonly string[]
  removeConversationIds?: readonly string[]
  /**
   * Filled with every requested conversation id the archive holds, so a caller
   * can tell an id that matched nothing from one a redaction found clean.
   */
  matchedConversationIds?: Set<string>
  /**
   * Filled, on a redaction, with every requested conversation holding secret
   * text in a field the redactor cannot rewrite (ids, paths, hosts): the plan
   * cannot clean those, and verify will fail on them.
   */
  unredactableConversationIds?: Set<string>
}
