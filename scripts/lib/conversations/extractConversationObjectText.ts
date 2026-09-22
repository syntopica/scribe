import { CONVERSATION_TEXT_KEYS } from './constants/CONVERSATION_TEXT_KEYS'

export const extractConversationObjectText = (
  object: Record<string, unknown>,
  depth: number,
  extract: (value: unknown, depth: number) => string,
) => {
  const fragments: string[] = []
  const type = typeof object['type'] === 'string' ? object['type'] : ''
  const name = typeof object['name'] === 'string' ? object['name'] : ''
  if (type.includes('tool') && name !== '') fragments.push(`tool: ${name}`)

  for (const key of CONVERSATION_TEXT_KEYS) {
    if (!(key in object)) continue
    const fragment = extract(object[key], depth + 1)
    if (fragment !== '' && !fragments.includes(fragment))
      fragments.push(fragment)
  }

  if (fragments.length === 0 && typeof object['payload'] === 'object') {
    return extract(object['payload'], depth + 1)
  }
  return fragments.join('\n')
}
