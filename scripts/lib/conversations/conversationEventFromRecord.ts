import { conversationEventKindFromRecord } from './conversationEventKindFromRecord'
import { conversationRoleFromRecord } from './conversationRoleFromRecord'
import { conversationTimestampFromRecord } from './conversationTimestampFromRecord'
import { extractConversationText } from './extractConversationText'
import { hashText } from './hashText'
import { isHarnessOnlyText } from './isHarnessOnlyText'
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
  const declared = conversationRoleFromRecord(record)
  // Claude Code injects reminders, command echoes and task notifications as
  // `user` lines; text made only of those tags is the harness speaking.
  const role =
    declared === 'user' && isHarnessOnlyText(text) ? 'system' : declared
  return {
    event: {
      id: hashText(`${String(index)}\0${text}`),
      kind: conversationEventKindFromRecord(record),
      role,
      text,
      ...(timestamp === undefined ? {} : { timestamp }),
    },
    redactions: redacted.redactions,
  }
}
