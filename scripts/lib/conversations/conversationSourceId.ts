import { SESSION_ID_KEYS } from './constants/SESSION_ID_KEYS'
import { findStringByKeys } from './findStringByKeys'

export const conversationSourceId = (records: unknown[], fallback: string) => {
  const sessionMetadata = records.find((record) => {
    if (typeof record !== 'object' || record === null) return false
    return (record as Record<string, unknown>)['type'] === 'session_meta'
  })
  const metadataId = findStringByKeys(sessionMetadata, new Set(['id']))
  if (metadataId !== undefined) return metadataId

  for (const record of records) {
    const found = findStringByKeys(record, SESSION_ID_KEYS)
    if (found !== undefined) return found
  }
  return fallback
}
