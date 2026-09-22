import { hashText } from '../hashText'
import type { ConversationFragmentEntry } from '../types/ConversationFragmentEntry'
import type { ConversationSegmentFooter } from '../types/ConversationSegmentFooter'
import type { ConversationSegmentHeader } from '../types/ConversationSegmentHeader'
import { parseConversationSegmentLines } from './parseConversationSegmentLines'
import { validateConversationSegmentEntry } from './validateConversationSegmentEntry'

/**
 * Read a segment that arrived as bytes, or say exactly why it cannot be trusted.
 *
 * Nothing here is recoverable by halves. Publication only names a file after
 * its footer is durable, so a segment with a broken footer, a miscounted entry
 * or a fragment whose hash does not match its bytes means damage rather than a
 * write in progress. Salvaging a valid prefix would turn detectable damage
 * into silent loss, which is the failure this whole format exists to remove.
 */
export const validateConversationSegment = (
  text: string,
): {
  header: ConversationSegmentHeader
  entries: ConversationFragmentEntry[]
} => {
  const lines = parseConversationSegmentLines(text)
  const headerLine = lines.at(0)
  const footerLine = lines.at(-1)
  if (headerLine === undefined || footerLine === undefined) {
    throw new Error('segment is missing its header or footer')
  }

  const header = JSON.parse(headerLine) as unknown
  if (
    typeof header !== 'object' ||
    header === null ||
    (header as { kind?: unknown }).kind !== 'rocket-agents-conversation-segment'
  ) {
    throw new Error('segment header is not a conversation segment')
  }
  const footer = JSON.parse(footerLine) as unknown
  if (
    typeof footer !== 'object' ||
    footer === null ||
    (footer as { kind?: unknown }).kind !==
      'rocket-agents-conversation-segment-footer'
  ) {
    throw new Error('segment does not end with a footer')
  }

  const validHeader = header as ConversationSegmentHeader
  const validFooter = footer as ConversationSegmentFooter
  const payload = `${lines.slice(0, -1).join('\n')}\n`
  if (hashText(payload) !== validFooter.payloadSha256) {
    throw new Error(
      'segment payload does not match the hash its footer declares',
    )
  }

  const entries = lines
    .slice(1, -1)
    .map((line) =>
      validateConversationSegmentEntry(
        JSON.parse(line),
        validHeader.schemaVersion,
      ),
    )
  if (
    entries.length !== validHeader.entryCount ||
    entries.length !== validFooter.entryCount
  ) {
    throw new Error('segment entry count disagrees with its header or footer')
  }
  return { header: validHeader, entries }
}
