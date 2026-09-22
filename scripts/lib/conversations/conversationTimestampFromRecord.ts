import { CONVERSATION_TIMESTAMP_KEYS } from './constants/CONVERSATION_TIMESTAMP_KEYS'
import { objectAt } from './objectAt'
import { stringAt } from './stringAt'

export const conversationTimestampFromRecord = (record: unknown) => {
  const payload = objectAt(record, 'payload')
  for (const key of CONVERSATION_TIMESTAMP_KEYS) {
    const candidate = stringAt(record, key) ?? stringAt(payload, key)
    if (candidate === undefined || Number.isNaN(Date.parse(candidate))) continue
    return new Date(candidate).toISOString()
  }
  return undefined
}
