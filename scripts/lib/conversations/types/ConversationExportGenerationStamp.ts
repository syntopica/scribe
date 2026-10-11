/** Which generation an export was materialized from, and its ancestors. */
export interface ConversationExportGenerationStamp {
  generationId: string
  /** Ancestor generation ids, newest first. */
  generationLineage: string[]
}
