import { CONVERSATION_ROLES } from './constants/CONVERSATION_ROLES'
import { isToolResultOnlyContent } from './isToolResultOnlyContent'
import { objectAt } from './objectAt'
import { stringAt } from './stringAt'
import type { ConversationRole } from './types/ConversationRole'

export const conversationRoleFromRecord = (
  record: unknown,
): ConversationRole => {
  if (typeof record === 'object' && record !== null) {
    const numericType = (record as Record<string, unknown>)['type']
    if (numericType === 1) return 'user'
    if (numericType === 2) return 'assistant'
  }
  const payload = objectAt(record, 'payload')
  const message = objectAt(record, 'message')
  // Before the declared role: Claude Code declares `user` for tool output.
  if (isToolResultOnlyContent(message?.['content'])) return 'tool'
  const candidate =
    stringAt(record, 'role') ??
    stringAt(message, 'role') ??
    stringAt(payload, 'role') ??
    stringAt(record, 'type')
  if (
    candidate !== undefined &&
    CONVERSATION_ROLES.has(candidate as ConversationRole)
  ) {
    return candidate as ConversationRole
  }
  if (candidate?.includes('user') === true || candidate === 'human')
    return 'user'
  if (candidate?.includes('assistant') === true || candidate === 'ai')
    return 'assistant'
  if (
    candidate?.includes('tool') === true ||
    candidate?.includes('function') === true
  )
    return 'tool'
  if (candidate?.includes('system') === true) return 'system'
  return 'unknown'
}
