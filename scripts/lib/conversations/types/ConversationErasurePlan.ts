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
  /** The generation the plan was computed against; apply refuses any other. */
  fromGenerationId: string
  /**
   * The generation applying the plan produced. Absent until the plan has been
   * applied; the generation id derives from the rewritten bytes, so it cannot
   * be known when the plan is written.
   */
  toGenerationId?: string
  segmentSetSha256: string
  createdAt: string
  reason: 'erasure' | 'redaction' | 'pack'
  /**
   * Every conversation the plan removes any fragment of, sorted. Part of the
   * contract with Atrium: `atrium erase --plan <file>` reads this field alone
   * and deletes the derived records of each id, because a synthesis built
   * from an erased fragment carries its text whether or not the conversation
   * keeps other fragments.
   */
  conversationIds: string[]
  conversations: {
    conversationId: string
    /** Fragment hashes that would not survive into the new generation. */
    removedFragmentSha256: string[]
    /** True when nothing of the conversation would remain. */
    removesConversation: boolean
  }[]
}
