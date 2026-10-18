import type { ConversationStringField } from './types/ConversationStringField'

/**
 * Every string inside `value`, at any depth, with a path such as
 * `record.events[2].text`. Keys and numbers are not strings a secret is
 * stored as, so only string values are listed.
 */
export const listConversationStringFields = (
  value: unknown,
  path: string,
): ConversationStringField[] => {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value))
    return value.flatMap((item: unknown, index) =>
      listConversationStringFields(item, `${path}[${String(index)}]`),
    )
  if (typeof value === 'object' && value !== null)
    return Object.entries(value).flatMap(([key, item]: [string, unknown]) =>
      listConversationStringFields(item, `${path}.${key}`),
    )
  return []
}
