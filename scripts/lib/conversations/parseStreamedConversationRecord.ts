import { Buffer } from 'node:buffer'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'
import { isConversationRecord } from './isConversationRecord'

export const parseStreamedConversationRecord = (
  line: string,
  recordNumber: number,
) => {
  if (line.trim() === '') return {}
  if (Buffer.byteLength(line) > MAX_CONVERSATION_FILE_BYTES) {
    return {
      error: `record ${String(recordNumber)} exceeds the safe size limit`,
    }
  }
  try {
    const parsed: unknown = JSON.parse(line)
    return isConversationRecord(parsed)
      ? { record: parsed }
      : { error: `record ${String(recordNumber)} failed schema validation` }
  } catch {
    return { error: `record ${String(recordNumber)} is not valid JSON` }
  }
}
