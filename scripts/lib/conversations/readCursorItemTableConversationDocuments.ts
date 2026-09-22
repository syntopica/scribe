import { Buffer } from 'node:buffer'
import { DatabaseSync } from 'node:sqlite'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'

export const readCursorItemTableConversationDocuments = (
  artifact: ConversationArtifact,
) => {
  const documents: ConversationDocument[] = []
  const database = new DatabaseSync(artifact.path, { readOnly: true })
  try {
    const statement = database.prepare(
      "SELECT rowid AS record_id, key, value FROM ItemTable WHERE key IN ('aiService.prompts', 'aiService.generations', 'composer.composerData', 'workbench.panel.aichat.view.aichat.chatdata') ORDER BY key",
    )
    for (const row of statement.iterate()) {
      if (typeof row['key'] !== 'string' || typeof row['value'] !== 'string')
        continue
      if (Buffer.byteLength(row['value']) > MAX_CONVERSATION_FILE_BYTES) {
        throw new Error(
          `Cursor conversation record exceeds the safe size limit: ${row['key']}`,
        )
      }
      const recordId =
        typeof row['record_id'] === 'number'
          ? String(row['record_id'])
          : row['key']
      documents.push({
        contents: row['value'],
        relativePath: `${artifact.relativePath}#ItemTable:${recordId}`,
        source: artifact.source,
        sourceIdHint: `${artifact.relativePath}:ItemTable:${recordId}`,
      })
    }
    return documents
  } finally {
    database.close()
  }
}
