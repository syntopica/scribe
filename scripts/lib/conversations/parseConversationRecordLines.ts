import { isConversationRecord } from './isConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationRecordsParseResult } from './types/ConversationRecordsParseResult'

export const parseConversationRecordLines = (
  lines: string[],
): ConversationRecordsParseResult => {
  const records: ConversationRecord[] = []
  const errors: string[] = []

  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') continue
    try {
      const parsed: unknown = JSON.parse(line)
      if (isConversationRecord(parsed)) records.push(parsed)
      else errors.push(`record ${String(index + 1)} failed schema validation`)
    } catch {
      errors.push(`record ${String(index + 1)} is not valid JSON`)
    }
  }
  return { records, errors }
}
