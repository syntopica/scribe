/** What one pass of the archive rewrite would change, or did. */
export interface ConversationRewriteChanges {
  records: number
  changed: number
  pathsNormalized: number
  pathBytesSaved: number
  titlesRedacted: number
  workspacesRedacted: number
  eventsRedacted: number
  /** Records still at schema 1; the writer would upgrade their event ids. */
  legacyRecords: number
}
