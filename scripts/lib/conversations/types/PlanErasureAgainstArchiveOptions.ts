/** A test archive and the fragments or conversations to plan away from it. */
export interface PlanErasureAgainstArchiveOptions {
  root: string
  removeFragmentSha256?: string[]
  removeConversationIds?: string[]
}
