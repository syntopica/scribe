import type { ConversationErasurePlan } from './types/ConversationErasurePlan'

/**
 * The plan as it reads once applied: the same plan, naming the generation it
 * produced.
 *
 * Atrium and the peers read the applied plan to know which generation the
 * erasure belongs to. The binding fields are untouched, so the applied plan is
 * still refused against any archive other than the one it was computed from.
 */
export const recordConversationErasureTarget = (
  plan: ConversationErasurePlan,
  toGenerationId: string,
): ConversationErasurePlan => ({ ...plan, toGenerationId })
