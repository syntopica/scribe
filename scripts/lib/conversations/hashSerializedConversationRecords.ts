import { createHash } from 'node:crypto'
import type { ConversationCaptureStore } from './ConversationCaptureStore'

export const hashSerializedConversationRecords = (
  store: ConversationCaptureStore,
) => {
  const hash = createHash('sha256')
  for (const record of store.serializedRecords()) hash.update(`${record}\n`)
  return hash.digest('hex')
}
