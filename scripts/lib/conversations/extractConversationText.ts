import { extractConversationObjectText } from './extractConversationObjectText'

export const extractConversationText = (value: unknown, depth = 0): string => {
  if (depth > 8 || value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return ''
  if (Array.isArray(value)) {
    return value
      .map((entry) => extractConversationText(entry, depth + 1))
      .filter((entry) => entry !== '')
      .join('\n')
  }

  return extractConversationObjectText(
    value as Record<string, unknown>,
    depth,
    extractConversationText,
  )
}
