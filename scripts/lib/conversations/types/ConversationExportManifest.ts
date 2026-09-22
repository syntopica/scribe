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
}
