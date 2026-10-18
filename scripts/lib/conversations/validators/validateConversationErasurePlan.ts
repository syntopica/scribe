import { isConversationDigest } from '../isConversationDigest'
import type { ConversationErasurePlan } from '../types/ConversationErasurePlan'

/**
 * Refuse a value that is not a well-formed v2 erasure plan.
 *
 * A plan file is edited by hand and copied between hosts, and its ids become
 * filesystem paths, so every digest is checked for shape, the two generations
 * must differ, and `conversationIds` must be exactly the sorted, unique ids of
 * `conversations`, each removing at least one fragment. Whether the plan
 * matches an archive is apply's and verify's question, not this one's.
 */
export const validateConversationErasurePlan = (
  value: unknown,
): ConversationErasurePlan => {
  const plan = value as Partial<ConversationErasurePlan>
  if (
    plan.kind !== 'rocket-agents-conversation-erasure-plan' ||
    plan.schemaVersion !== 2
  ) {
    throw new Error('not a v2 conversation erasure plan')
  }
  if (!isConversationDigest(plan.fromGenerationId))
    throw new Error('fromGenerationId is not a 64-character hex id')
  if (
    plan.toGenerationId !== undefined &&
    !isConversationDigest(plan.toGenerationId)
  ) {
    throw new Error('toGenerationId is not a 64-character hex id')
  }
  if (plan.toGenerationId === plan.fromGenerationId)
    throw new Error('toGenerationId is the generation the plan erases from')
  if (!isConversationDigest(plan.segmentSetSha256))
    throw new Error('segmentSetSha256 is not a 64-character hex digest')
  if (
    plan.reason !== 'erasure' &&
    plan.reason !== 'redaction' &&
    plan.reason !== 'pack'
  ) {
    throw new Error('reason must be erasure, redaction or pack')
  }
  if (
    plan.reason === 'redaction'
      ? !isConversationDigest(plan.redactorSha256)
      : plan.redactorSha256 !== undefined
  ) {
    throw new Error(
      'redactorSha256 is a 64-character hex digest on a redaction plan, and absent otherwise',
    )
  }
  if (
    !Array.isArray(plan.conversations) ||
    !Array.isArray(plan.conversationIds)
  )
    throw new Error('conversations and conversationIds must be arrays')
  for (const entry of plan.conversations) {
    if (
      typeof entry.conversationId !== 'string' ||
      !Array.isArray(entry.removedFragmentSha256) ||
      entry.removedFragmentSha256.length === 0 ||
      !entry.removedFragmentSha256.every(isConversationDigest)
    ) {
      throw new Error(
        'every conversation must remove at least one 64-character hex fragment',
      )
    }
  }
  const expected = [
    ...new Set(plan.conversations.map((entry) => entry.conversationId)),
  ].toSorted((left, right) => left.localeCompare(right))
  if (
    expected.length !== plan.conversations.length ||
    JSON.stringify(plan.conversationIds) !== JSON.stringify(expected) ||
    JSON.stringify(plan.conversations.map((entry) => entry.conversationId)) !==
      JSON.stringify(expected)
  ) {
    throw new Error(
      'conversationIds must be the sorted, unique ids of conversations, in the same order',
    )
  }
  return plan as ConversationErasurePlan
}
