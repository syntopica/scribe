import { openCodeTimestamp } from './openCodeTimestamp'
import { parseOpenCodeSqliteData } from './parseOpenCodeSqliteData'
import type { OpenCodeConversation } from './types/OpenCodeConversation'

export const appendOpenCodeSqliteRow = (
  conversations: Map<string, OpenCodeConversation>,
  row: Record<string, unknown>,
) => {
  if (
    typeof row['session_id'] !== 'string' ||
    typeof row['message_id'] !== 'string'
  )
    return
  const current = conversations.get(row['session_id']) ?? {
    metadata: {
      sessionId: row['session_id'],
      title: row['session_title'],
      workspace: row['session_directory'],
      parentId: row['session_parent_id'],
      createdAt: openCodeTimestamp(row['session_time_created']),
      updatedAt: openCodeTimestamp(row['session_time_updated']),
    },
    messages: new Map<string, Record<string, unknown>>(),
  }
  const message = current.messages.get(row['message_id']) ?? {
    ...parseOpenCodeSqliteData(
      'message',
      row['message_id'],
      row['message_data'],
    ),
    id: row['message_id'],
    sessionId: row['session_id'],
    timestamp: openCodeTimestamp(row['message_time_created']),
    parts: [],
  }
  if (typeof row['part_id'] === 'string') {
    const parts = message['parts'] as unknown[]
    parts.push({
      ...parseOpenCodeSqliteData('part', row['part_id'], row['part_data']),
      id: row['part_id'],
      timestamp: openCodeTimestamp(row['part_time_created']),
    })
  }
  current.messages.set(row['message_id'], message)
  conversations.set(row['session_id'], current)
}
