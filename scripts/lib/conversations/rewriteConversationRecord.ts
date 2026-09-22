import { redactConversationHome } from './redactConversationHome'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationRewriteChanges } from './types/ConversationRewriteChanges'

/**
 * The two repairs the archived records need, applied to one record.
 *
 * Both change stored values that no capture will revisit: the 5,121 records
 * whose `workspace` still names the real home came from a recovery tree that
 * no longer exists, and the 1.2 GB of repeated `provenance.relativePath` was
 * appended by a merge that has since been fixed. So this is a transform of
 * history, and it keeps everything that identifies the record - the id, the
 * source hash, every event id, the hosts - and changes only the bytes named
 * below. Deterministic and idempotent: the same prefixes on both Macs give
 * the same record, and a second pass changes nothing.
 *
 * Event ids are not recomputed. They derive from the text a capture saw, and
 * the index that text was hashed with is not stored, so a redacted event keeps
 * the id it was archived under - which is also what keeps the two Macs' copies
 * mergeable afterwards.
 */
export const rewriteConversationRecord = (
  record: ConversationRecord,
  homes: readonly string[],
  changes: ConversationRewriteChanges,
): { record: ConversationRecord; changed: boolean } => {
  changes.records++
  if (record.schemaVersion !== 2) changes.legacyRecords++

  const joined = record.provenance.relativePath
  const relativePath = [
    ...new Set(joined.split(',').filter((entry) => entry.length > 0)),
  ]
    .toSorted((left, right) => left.localeCompare(right))
    .join(',')
  const pathChanged = relativePath !== joined
  if (pathChanged) {
    changes.pathsNormalized++
    changes.pathBytesSaved += joined.length - relativePath.length
  }

  const redacted = [...homes]
    .filter((home) => home.length > 1)
    .toSorted((left, right) => right.length - left.length)
    .reduce((current, home) => redactConversationHome(current, home), record)
  const titleChanged = redacted.title !== record.title
  const workspaceChanged = redacted.workspace !== record.workspace
  const eventsChanged = redacted.events.filter(
    (event, index) => event.text !== record.events[index]?.text,
  ).length
  if (titleChanged) changes.titlesRedacted++
  if (workspaceChanged) changes.workspacesRedacted++
  changes.eventsRedacted += eventsChanged

  const changed =
    pathChanged || titleChanged || workspaceChanged || eventsChanged > 0
  if (changed) changes.changed++
  return {
    changed,
    record: changed
      ? { ...redacted, provenance: { ...redacted.provenance, relativePath } }
      : record,
  }
}
