import { DatabaseSync } from 'node:sqlite'
import { appendOpenCodeSqliteRow } from './appendOpenCodeSqliteRow'
import { openCodeDocumentsFromConversations } from './openCodeDocumentsFromConversations'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { OpenCodeConversation } from './types/OpenCodeConversation'

export const readOpenCodeSqliteConversationDocuments = (
  artifact: ConversationArtifact,
) => {
  const conversations = new Map<string, OpenCodeConversation>()
  const database = new DatabaseSync(artifact.path, { readOnly: true })
  try {
    const statement = database.prepare(`
      SELECT
        s.id AS session_id,
        s.title AS session_title,
        s.directory AS session_directory,
        s.parent_id AS session_parent_id,
        s.time_created AS session_time_created,
        s.time_updated AS session_time_updated,
        m.id AS message_id,
        m.time_created AS message_time_created,
        m.data AS message_data,
        p.id AS part_id,
        p.time_created AS part_time_created,
        p.data AS part_data
      FROM session AS s
      JOIN message AS m ON m.session_id = s.id
      LEFT JOIN part AS p ON p.message_id = m.id
      ORDER BY s.time_created, m.time_created, p.time_created, p.rowid
    `)
    for (const row of statement.iterate())
      appendOpenCodeSqliteRow(conversations, row)
    return openCodeDocumentsFromConversations(artifact, conversations)
  } finally {
    database.close()
  }
}
