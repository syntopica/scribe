/** What purging one generation would remove, and why it may not. */
export interface ConversationGenerationPurge {
  generationId: string
  directory: string
  segments: number
  bytes: number
  /** Set when the generation must stay: selected, or the rollback target. */
  refusal?: string
}
