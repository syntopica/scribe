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
}
