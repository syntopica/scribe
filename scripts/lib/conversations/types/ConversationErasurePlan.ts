/**
 * What a proposed erasure would remove, bound to the archive it was read from.
 *
 * Reviewable before it is irreversible. The plan names the exact generation and
 * segment digest it was computed against, so a plan written against an archive
 * that has since moved is refused rather than applied to a corpus it never saw.
 */
export interface ConversationErasurePlan {
  kind: 'rocket-agents-conversation-erasure-plan'
  schemaVersion: 2
  fromGenerationId: string
  segmentSetSha256: string
  createdAt: string
  reason: 'erasure' | 'redaction' | 'pack'
  conversations: {
    conversationId: string
    /** Fragment hashes that would not survive into the new generation. */
    removedFragmentSha256: string[]
    /** True when nothing of the conversation would remain. */
    removesConversation: boolean
  }[]
}
