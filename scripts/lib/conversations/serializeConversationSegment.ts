import { hashConversationFragment } from './hashConversationFragment'
import { hashText } from './hashText'
import { mergeConversationHosts } from './mergeConversationHosts'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationSegmentFooter } from './types/ConversationSegmentFooter'
import type { ConversationSegmentHeader } from './types/ConversationSegmentHeader'

/**
 * One capture's fragments, as the exact bytes that will be published.
 *
 * Header, one entry per fragment sorted by hash, footer. Sorted so that two
 * hosts capturing the same fragments produce the same bytes and therefore the
 * same object, rather than two copies of one thing. The hosts that observed a
 * fragment ride beside its record, outside the hash, so one record given
 * twice with different hosts is one entry naming both.
 *
 * Every line ends with a single LF and contains none, because JSON escapes
 * control characters. A reader may split on `\n` alone; nothing here will ever
 * hand it a bare carriage return to guess about.
 */
export const serializeConversationSegment = (options: {
  fragments: ConversationRecord[]
  generationId: string
  createdAt: string
}) => {
  const byHash = new Map<
    string,
    { record: ConversationRecord; hosts: string[] | undefined }
  >()
  for (const record of options.fragments) {
    const hash = hashConversationFragment(record)
    const staged = byHash.get(hash)
    byHash.set(hash, {
      record,
      hosts: mergeConversationHosts(staged?.hosts, record.hosts),
    })
  }
  const entries = [...byHash.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([hash, { record, hosts }]) =>
      JSON.stringify({
        kind: 'conversation-fragment',
        conversationId: record.id,
        fragmentSha256: hash,
        record: JSON.parse(
          serializeCanonicalConversationRecord(record),
        ) as ConversationRecord,
        ...(hosts === undefined ? {} : { hosts }),
      }),
    )
  const header: ConversationSegmentHeader = {
    kind: 'rocket-agents-conversation-segment',
    schemaVersion: 2,
    generationId: options.generationId,
    createdAt: options.createdAt,
    entryCount: entries.length,
  }
  const body = entries.map((entry) => entry + '\n').join('')
  const payload = `${JSON.stringify(header)}\n${body}`
  const footer: ConversationSegmentFooter = {
    kind: 'rocket-agents-conversation-segment-footer',
    entryCount: entries.length,
    payloadSha256: hashText(payload),
  }
  return `${payload}${JSON.stringify(footer)}\n`
}
