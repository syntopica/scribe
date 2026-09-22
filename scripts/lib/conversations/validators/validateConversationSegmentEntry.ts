import { hashConversationFragment } from '../hashConversationFragment'
import type { ConversationFragmentEntry } from '../types/ConversationFragmentEntry'

/**
 * Accept one entry read off disk, or say exactly what is wrong with it.
 *
 * Takes `unknown` on purpose. A segment arrives as bytes from a peer or a
 * backup, so a typed parameter would only re-check what the type system had
 * already assumed and would leave the real input unvalidated.
 */
export const validateConversationSegmentEntry = (
  value: unknown,
  headerSchemaVersion: number,
): ConversationFragmentEntry => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('segment entry is not an object')
  }
  const entry = value as Partial<ConversationFragmentEntry>
  if (entry.kind !== 'conversation-fragment') {
    throw new Error(`segment holds an unknown entry kind ${String(entry.kind)}`)
  }
  if (entry.record === undefined || typeof entry.fragmentSha256 !== 'string') {
    throw new Error('segment entry is missing its record or hash')
  }
  if (entry.conversationId !== entry.record.id) {
    throw new Error(
      'segment entry names a different conversation than its record',
    )
  }
  if (hashConversationFragment(entry.record) !== entry.fragmentSha256) {
    throw new Error('segment entry hash does not match the record it carries')
  }
  if (entry.record.schemaVersion > headerSchemaVersion) {
    throw new Error('segment header is older than a record it covers')
  }
  if (
    entry.hosts !== undefined &&
    (!Array.isArray(entry.hosts) ||
      entry.hosts.some((host) => typeof host !== 'string' || host.length === 0))
  ) {
    throw new Error('segment entry names hosts that are not labels')
  }
  return entry as ConversationFragmentEntry
}
