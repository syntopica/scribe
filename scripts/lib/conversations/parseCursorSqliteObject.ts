import { parseJsonValue } from './parseJsonValue'

export const parseCursorSqliteObject = (key: string, value: string) => {
  const parsed = parseJsonValue(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Cursor conversation record is not a JSON object: ${key}`)
  }
  return parsed as Record<string, unknown>
}
