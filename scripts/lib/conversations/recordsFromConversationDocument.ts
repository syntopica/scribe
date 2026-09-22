import { parseJsonValue } from './parseJsonValue'
import { unwrapConversationContainer } from './unwrapConversationContainer'

export const recordsFromConversationDocument = (contents: string) => {
  const whole = parseJsonValue(contents)
  if (whole !== undefined) return unwrapConversationContainer(whole)

  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line, index) => {
      const parsed = parseJsonValue(line)
      if (parsed === undefined) {
        throw new Error(
          `invalid conversation JSON at line ${String(index + 1)}`,
        )
      }
      return parsed
    })
}
