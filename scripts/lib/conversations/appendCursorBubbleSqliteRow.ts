import { parseCursorSqliteObject } from './parseCursorSqliteObject'
import { projectCursorBubble } from './projectCursorBubble'
import type { CursorConversation } from './types/CursorConversation'
import type { CursorSqliteRow } from './types/CursorSqliteRow'

export const appendCursorBubbleSqliteRow = (
  conversations: Map<string, CursorConversation>,
  row: CursorSqliteRow,
) => {
  const composerId = row.key.split(':')[1]
  if (composerId === undefined) return
  const current = conversations.get(composerId) ?? { messages: [] }
  current.messages.push(
    projectCursorBubble(parseCursorSqliteObject(row.key, row.value)),
  )
  conversations.set(composerId, current)
}
