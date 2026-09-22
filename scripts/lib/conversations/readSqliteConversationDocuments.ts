import { listSqliteTables } from './listSqliteTables'
import { readSpecializedSqliteConversationDocuments } from './readSpecializedSqliteConversationDocuments'
import { runSqliteQuery } from './runSqliteQuery'
import { sqliteConversationQuery } from './sqliteConversationQuery'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'

export const readSqliteConversationDocuments = (
  artifact: ConversationArtifact,
): ConversationDocument[] => {
  const documents: ConversationDocument[] = []
  const tables = listSqliteTables(artifact.path)
  const specialized = readSpecializedSqliteConversationDocuments(
    artifact,
    tables,
  )
  if (specialized !== undefined) return specialized

  for (const table of tables) {
    if (
      artifact.source === 'cursor' &&
      ['cursorDiskKV', 'ItemTable'].includes(table)
    )
      continue
    const query = sqliteConversationQuery(table, artifact.source)
    if (query === undefined) continue

    const rows = runSqliteQuery(artifact.path, query)
    for (const row of rows) {
      const recordId =
        typeof row['record_id'] === 'string' ||
        typeof row['record_id'] === 'number'
          ? String(row['record_id'])
          : String(documents.length)
      documents.push({
        contents:
          typeof row['value'] === 'string' ? row['value'] : JSON.stringify(row),
        relativePath: `${artifact.relativePath}#${table}:${recordId}`,
        source: artifact.source,
        sourceIdHint: `${artifact.relativePath}:${table}:${recordId}`,
      })
    }
  }

  return documents
}
