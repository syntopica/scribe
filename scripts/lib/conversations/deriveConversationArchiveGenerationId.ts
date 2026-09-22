import { hashText } from './hashText'

/**
 * Name a generation after the sanitized corpus that opens it.
 *
 * Derived rather than random, so two hosts that apply the same reviewed
 * erasure to the same archive arrive at the same generation id without
 * coordinating, and a host cannot invent a generation that looks legitimate
 * without actually holding the bytes it claims.
 */
export const deriveConversationArchiveGenerationId = (
  baseSegmentSha256: string[],
) =>
  hashText(
    [
      'rocket-agents-conversation-generation-v2',
      ...[...baseSegmentSha256].toSorted((left, right) =>
        left.localeCompare(right),
      ),
    ].join('\n'),
  )
