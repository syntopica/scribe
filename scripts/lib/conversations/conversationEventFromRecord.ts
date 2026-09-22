import { conversationEventKindFromRecord } from './conversationEventKindFromRecord'
import { conversationRoleFromRecord } from './conversationRoleFromRecord'
import { conversationTimestampFromRecord } from './conversationTimestampFromRecord'
import { extractConversationText } from './extractConversationText'
import { hashText } from './hashText'
import { redactSensitiveText } from './redactSensitiveText'
import type { ConversationEvent } from './types/ConversationEvent'

export const conversationEventFromRecord = (
  record: unknown,
  index: number,
): { event?: ConversationEvent; redactions: number } => {
  const redacted = redactSensitiveText(extractConversationText(record))
  const text = redacted.text.trim()
  if (text === '') return { redactions: redacted.redactions }

  const timestamp = conversationTimestampFromRecord(record)
  return {
    event: {
      id: hashText(`${String(index)}\0${text}`),
      kind: conversationEventKindFromRecord(record),
      role: conversationRoleFromRecord(record),
      text,
      ...(timestamp === undefined ? {} : { timestamp }),
    },
    redactions: redacted.redactions,
  }
}
