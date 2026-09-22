import { CONVERSATION_CONTAINER_KEYS } from './constants/CONVERSATION_CONTAINER_KEYS'
import { parseJsonValue } from './parseJsonValue'

export const unwrapConversationContainer = (
  value: unknown,
  depth = 0,
): unknown[] => {
  if (depth > 4) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const nested = parseJsonValue(value)
    return nested === undefined
      ? [value]
      : unwrapConversationContainer(nested, depth + 1)
  }
  if (typeof value !== 'object' || value === null) return [value]

  const object = value as Record<string, unknown>
  if (Array.isArray(object['tabs'])) {
    return object['tabs'].flatMap((tab) =>
      unwrapConversationContainer(tab, depth + 1),
    )
  }
  for (const key of CONVERSATION_CONTAINER_KEYS) {
    if (Array.isArray(object[key])) return object[key]
  }
  for (const key of ['value', 'data'] as const) {
    const candidate = object[key]
    if (typeof candidate !== 'string') continue
    const nested = parseJsonValue(candidate)
    if (nested !== undefined)
      return unwrapConversationContainer(nested, depth + 1)
  }
  return [value]
}
