export interface ConversationExportManifest {
  kind: 'rocket-agents-conversation-export'
  schemaVersion: 1 | 2
  createdAt: string
  records: number
  contentSha256: string
  /**
   * Present (as false) only when the export was produced with --allow-partial
   * and artifacts were skipped. A complete export omits both fields, so
   * existing manifests and readers are unaffected.
   */
  complete?: false
  skipped?: string[]
  /**
   * Present on an export materialized from a segment archive
   * (`export-materialized`, `export-pending`): the generation it was read
   * from, and that generation's ancestors, newest first. Generation ids are
   * content hashes and cannot be ordered, so Atrium accepts an erasure plan
   * only when its `toGenerationId` is `generationId` or is in the lineage.
   * The lineage ends at the first generation with no recorded parent, or
   * whose manifest this installation no longer holds.
   */
  generationId?: string
  generationLineage?: string[]
}
