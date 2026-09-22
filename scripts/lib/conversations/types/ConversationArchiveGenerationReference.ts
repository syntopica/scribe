/**
 * `current-generation.json`: the one mutable byte-range in the whole archive.
 *
 * Everything else is immutable and content-addressed. Selecting a generation
 * is therefore a single small replacing rename, and rolling an erasure back
 * before the old copies are purged is that same rename in reverse.
 */
export interface ConversationArchiveGenerationReference {
  kind: 'rocket-agents-conversation-generation-reference'
  schemaVersion: 2
  generationId: string
  updatedAt: string
}
