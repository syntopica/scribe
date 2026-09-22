import type { ConversationEvent } from './types/ConversationEvent'

export const isConversationEvent = (
  value: unknown,
): value is ConversationEvent => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const event = value as Record<string, unknown>
  return (
    typeof event['id'] === 'string' &&
    typeof event['kind'] === 'string' &&
    typeof event['role'] === 'string' &&
    typeof event['text'] === 'string' &&
    (event['timestamp'] === undefined || typeof event['timestamp'] === 'string')
  )
}
