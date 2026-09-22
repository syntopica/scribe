import { isConversationEvent } from './isConversationEvent'
import { isConversationSource } from './isConversationSource'
import { isSafeConversationRelativePath } from './isSafeConversationRelativePath'
import type { ConversationRecord } from './types/ConversationRecord'

export const isConversationRecord = (
  value: unknown,
): value is ConversationRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const record = value as Record<string, unknown>
  const provenance = record['provenance']
  if (
    typeof provenance !== 'object' ||
    provenance === null ||
    Array.isArray(provenance)
  )
    return false
  const origin = provenance as Record<string, unknown>

  return (
    (record['schemaVersion'] === 1 || record['schemaVersion'] === 2) &&
    typeof record['id'] === 'string' &&
    isConversationSource(record['source']) &&
    typeof record['sourceId'] === 'string' &&
    typeof record['title'] === 'string' &&
    Array.isArray(record['events']) &&
    record['events'].length <= 100_000 &&
    record['events'].every(isConversationEvent) &&
    typeof origin['contentSha256'] === 'string' &&
    typeof origin['relativePath'] === 'string' &&
    isSafeConversationRelativePath(origin['relativePath']) &&
    typeof origin['redactions'] === 'number' &&
    (record['hosts'] === undefined ||
      (Array.isArray(record['hosts']) &&
        record['hosts'].every(
          (host) => typeof host === 'string' && host.length > 0,
        )))
  )
}
