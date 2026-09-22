import { DatabaseSync } from 'node:sqlite'
import { appendCursorBubbleSqliteRow } from './appendCursorBubbleSqliteRow'
import { appendCursorComposerSqliteRow } from './appendCursorComposerSqliteRow'
import { cursorDocumentsFromConversations } from './cursorDocumentsFromConversations'
import { forEachCursorSqliteRecord } from './forEachCursorSqliteRecord'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { CursorConversation } from './types/CursorConversation'

export const readCursorSqliteConversationDocuments = (
  artifact: ConversationArtifact,
) => {
  const conversations = new Map<string, CursorConversation>()
  const database = new DatabaseSync(artifact.path, { readOnly: true })
  try {
    forEachCursorSqliteRecord(database, 'composerData:', (row) => {
      appendCursorComposerSqliteRow(conversations, row)
    })
    forEachCursorSqliteRecord(database, 'bubbleId:', (row) => {
      appendCursorBubbleSqliteRow(conversations, row)
    })
    return cursorDocumentsFromConversations(artifact, conversations)
  } finally {
    database.close()
  }
}
