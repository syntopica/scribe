import type { ConversationRecord } from '../types/ConversationRecord'

/**
 * What the archive holds for a conversation captured before 2026-10-11: the
 * same record, with tool output and harness text archived as the user's.
 */
export const archiveReclassifiedRolesAsUser = (
  record: ConversationRecord,
): ConversationRecord => ({
  ...record,
  events: record.events.map((event) =>
    event.role === 'tool' || event.role === 'system'
      ? { ...event, role: 'user' }
      : event,
  ),
})
