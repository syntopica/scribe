/**
 * `generation.json`: the sealed set of base segments a generation opens with.
 *
 * Erasure replaces the whole generation rather than editing a segment, so this
 * file is the only place that says which segments were present before any
 * capture appended to it. A reader that finds a base segment not listed here
 * is looking at a segment from another generation.
 */
export interface ConversationArchiveGeneration {
  kind: 'rocket-agents-conversation-generation'
  schemaVersion: 2
  generationId: string
  createdAt: string
  baseSegmentSha256: string[]
  /**
   * The generation this one was rewritten from, when it was: an erasure records
   * the generation it was applied to. Absent for a generation migrated from v1
   * or initialized empty, and for any generation sealed before parents were
   * recorded (2026-10-11); a lineage walk ends there. Not part of the id, which
   * derives from the base segments alone.
   */
  parentGenerationId?: string
}
