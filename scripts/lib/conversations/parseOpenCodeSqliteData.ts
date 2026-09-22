import { parseJsonValue } from './parseJsonValue'

export const parseOpenCodeSqliteData = (
  kind: string,
  id: string,
  value: unknown,
) => {
  if (typeof value !== 'string')
    throw new Error(`OpenCode ${kind} data is not text: ${id}`)
  const parsed = parseJsonValue(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`OpenCode ${kind} data is not a JSON object: ${id}`)
  }
  return parsed as Record<string, unknown>
}
