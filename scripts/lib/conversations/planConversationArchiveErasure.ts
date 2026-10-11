import { hashConversationSegmentSet } from './hashConversationSegmentSet'
import type { ConversationErasurePlan } from './types/ConversationErasurePlan'
import type { ConversationFragmentReference } from './types/ConversationFragmentReference'

/**
 * Say what an erasure would remove, before anything is removed.
 *
 * Erasure is the one operation this archive cannot take back, and the archive
 * holds 4,617 conversations that exist nowhere else. So it is planned, read,
 * and only then applied. The plan binds itself to the exact segment set it was
 * computed from: applying it to an archive that has moved would erase against
 * a corpus it never saw.
 *
 * Planning only. Nothing here reads or writes the filesystem, and a plan that
 * matches nothing is returned empty rather than treated as an error -- an
 * erasure that finds its target already gone is a success, not a failure.
 */
export const planConversationArchiveErasure = (options: {
  entries: readonly ConversationFragmentReference[]
  segmentSha256: string[]
  fromGenerationId: string
  createdAt: string
  reason: ConversationErasurePlan['reason']
  removeFragmentSha256?: readonly string[]
  removeConversationIds?: readonly string[]
}): ConversationErasurePlan => {
  const removedFragments = new Set(options.removeFragmentSha256 ?? [])
  const removedConversations = new Set(options.removeConversationIds ?? [])

  const byConversation = new Map<string, string[]>()
  for (const entry of options.entries) {
    const hashes = byConversation.get(entry.conversationId) ?? []
    hashes.push(entry.fragmentSha256)
    byConversation.set(entry.conversationId, hashes)
  }

  const conversations = [...byConversation.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .flatMap(([conversationId, hashes]) => {
      const whole = removedConversations.has(conversationId)
      const removed = [...new Set(hashes)]
        .filter((hash) => whole || removedFragments.has(hash))
        .toSorted((left, right) => left.localeCompare(right))
      if (removed.length === 0) return []
      return [
        {
          conversationId,
          removedFragmentSha256: removed,
          removesConversation: removed.length === new Set(hashes).size,
        },
      ]
    })

  return {
    kind: 'rocket-agents-conversation-erasure-plan',
    schemaVersion: 2,
    fromGenerationId: options.fromGenerationId,
    segmentSetSha256: hashConversationSegmentSet(options.segmentSha256),
    createdAt: options.createdAt,
    reason: options.reason,
    conversationIds: conversations.map((entry) => entry.conversationId),
    conversations,
  }
}
