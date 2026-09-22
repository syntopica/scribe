import { readCursorItemTableConversationDocuments } from './readCursorItemTableConversationDocuments'
import { readCursorSqliteConversationDocuments } from './readCursorSqliteConversationDocuments'
import { readOpenCodeSqliteConversationDocuments } from './readOpenCodeSqliteConversationDocuments'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'

export const readSpecializedSqliteConversationDocuments = (
  artifact: ConversationArtifact,
  tables: readonly string[],
) => {
  if (artifact.source === 'opencode') {
    return ['session', 'message', 'part'].every((table) =>
      tables.includes(table),
    )
      ? readOpenCodeSqliteConversationDocuments(artifact)
      : undefined
  }
  if (artifact.source !== 'cursor') return undefined

  const documents: ConversationDocument[] = []
  if (tables.includes('cursorDiskKV')) {
    documents.push(...readCursorSqliteConversationDocuments(artifact))
  }
  if (tables.includes('ItemTable')) {
    documents.push(...readCursorItemTableConversationDocuments(artifact))
  }
  return documents
}
