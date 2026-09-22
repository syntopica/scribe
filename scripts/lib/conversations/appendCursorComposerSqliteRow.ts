import { parseCursorSqliteObject } from './parseCursorSqliteObject'
import { projectCursorBubble } from './projectCursorBubble'
import type { CursorConversation } from './types/CursorConversation'
import type { CursorSqliteRow } from './types/CursorSqliteRow'

export const appendCursorComposerSqliteRow = (
  conversations: Map<string, CursorConversation>,
  row: CursorSqliteRow,
) => {
  const composerId = row.key.slice('composerData:'.length)
  const value = parseCursorSqliteObject(row.key, row.value)
  const current = conversations.get(composerId) ?? { messages: [] }
  current.metadata = {
    composerId: value['composerId'] ?? composerId,
    name: value['name'] ?? value['title'],
    workspace: value['workspace'] ?? value['workspaceId'],
  }

  if (Array.isArray(value['conversation'])) {
    for (const bubble of value['conversation']) {
      if (typeof bubble === 'object' && bubble !== null) {
        current.messages.push(
          projectCursorBubble(bubble as Record<string, unknown>),
        )
      }
    }
  }
  conversations.set(composerId, current)
}
