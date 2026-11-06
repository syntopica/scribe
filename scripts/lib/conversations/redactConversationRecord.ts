import { redactConversationText } from './redactConversationText'
import type { ConversationRecord } from './types/ConversationRecord'
import type { KnownSecretRedactor } from './types/KnownSecretRedactor'

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
 *
 * A redaction of the archive passes `redactKnown`, built from every value the
 * pattern redactor removes from the planned fragments, so a credential removed
 * where it was labelled is also removed where it was pasted bare.
 */
export const redactConversationRecord = (
  record: ConversationRecord,
  redactKnown?: KnownSecretRedactor,
): ConversationRecord => {
  const title = redactConversationText(record.title, redactKnown)
  const workspace =
    record.workspace === undefined
      ? undefined
      : redactConversationText(record.workspace, redactKnown)
  const events = record.events.map((event) => ({
    event,
    redacted: redactConversationText(event.text, redactKnown),
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
    // Only an event the redactor changed is rewritten, and trimmed as capture
    // trims: the others keep their bytes, whitespace included.
    events: events.map(({ event, redacted }) =>
      redacted.redactions === 0
        ? event
        : { ...event, text: redacted.text.trim() },
    ),
    provenance: {
      ...record.provenance,
      redactions: record.provenance.redactions + redactions,
    },
  }
}
