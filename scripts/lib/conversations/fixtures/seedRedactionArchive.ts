import type { ConversationRecord } from '../types/ConversationRecord'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationFragment } from './createConversationFragment'
import { REDACTION_FIXTURE_SECRET } from './REDACTION_FIXTURE_SECRET'
import { seedConversationSegmentArchive } from './seedConversationSegmentArchive'

/**
 * Conversation `s` as an older, weaker redactor stored it: one revision whose
 * first event still carries a password, one with nothing to redact, and an
 * unrelated conversation `b`.
 */
export const seedRedactionArchive = async (context: TestCleanupContext) => {
  const base = createConversationFragment({ id: 's', events: 3, source: 'old' })
  const leaked: ConversationRecord = {
    ...base,
    events: base.events.map((event, index) =>
      index === 0
        ? {
            ...event,
            text: `connect with password=${REDACTION_FIXTURE_SECRET}`,
          }
        : event,
    ),
  }
  const clean = createConversationFragment({ id: 's', events: 2, source: 'ok' })
  const other = createConversationFragment({ id: 'b', events: 2 })
  const archive = await seedConversationSegmentArchive(context, [
    leaked,
    clean,
    other,
  ])
  return { ...archive, leaked, clean, other }
}
