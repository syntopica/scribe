import { listConversationSecretTokens } from './listConversationSecretTokens'
import { trimConversationQuotes } from './trimConversationQuotes'

/**
 * The stretches of `original` the redactor replaced to produce `redacted`.
 *
 * The redacted text is the original with some spans swapped for
 * `[REDACTED:...]` markers, so the literal text between markers is found in
 * the original in order and what lies between is what was removed.
 *
 * Each span is returned as the bare value: surrounding whitespace and quotes
 * are stripped, because a quoted password's span starts at its opening quote
 * and a bare copy elsewhere must still be found. A span shorter than 6
 * characters, or made only of an older `[REDACTED:...]` marker, is dropped:
 * a needle that short would match all over a corpus. Every secret pattern
 * needs at least 8 characters; only URL credentials can be shorter, and a
 * credential under 6 characters is not searched for. Each kept span is
 * followed by its sub-needles (`listConversationSecretTokens`), so a surviving
 * part of a compound secret is found as well as the whole.
 */
export const listRedactedSpans = (original: string, redacted: string) => {
  const marker = /\[REDACTED:[a-z-]+\]/gu
  const pieces = redacted.split(marker)
  const spans: string[] = []
  let position = (pieces[0] ?? '').length
  for (const [index, piece] of pieces.entries()) {
    if (index === 0) continue
    const end =
      index === pieces.length - 1
        ? original.length - piece.length
        : original.indexOf(piece, position)
    spans.push(original.slice(position, end))
    position = end + piece.length
  }
  return [
    ...new Set(
      spans
        .map((span) => trimConversationQuotes(span.trim()).trim())
        .filter((span) => span.replaceAll(marker, '').trim().length >= 6)
        .flatMap((span) => [span, ...listConversationSecretTokens(span)]),
    ),
  ]
}
