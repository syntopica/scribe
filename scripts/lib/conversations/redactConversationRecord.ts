import { redactSensitiveText } from './redactSensitiveText'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * One archived record as the current redactor would have stored it.
 *
 * The title, the workspace and every event text go through the redactor
 * capture applies to event text (capture itself only strips the home from a
 * workspace, but a secret there is a leak all the same), and
 * the new redactions are added to `provenance.redactions`. Event ids are kept,
 * for the reason `rewriteConversationRecord` gives: the index they were hashed
 * with is not stored. A record the redactor finds nothing in comes back as the
 * same object, so its fragment hash is unchanged.
 */
export const redactConversationRecord = (
  record: ConversationRecord,
): ConversationRecord => {
  const title = redactSensitiveText(record.title)
  const workspace =
    record.workspace === undefined
      ? undefined
      : redactSensitiveText(record.workspace)
  const events = record.events.map((event) => ({
    event,
    redacted: redactSensitiveText(event.text),
  }))
  const redactions = events.reduce(
    (total, { redacted }) => total + redacted.redactions,
    title.redactions + (workspace?.redactions ?? 0),
  )
  if (redactions === 0) return record
  return {
    ...record,
    title: title.text,
    ...(workspace === undefined ? {} : { workspace: workspace.text }),
    events: events.map(({ event, redacted }) => ({
      ...event,
      text: redacted.text.trim(),
    })),
    provenance: {
      ...record.provenance,
      redactions: record.provenance.redactions + redactions,
    },
  }
}
