import { trimConversationPunctuation } from './trimConversationPunctuation'

/**
 * The pieces of one removed span that are worth searching for on their own.
 *
 * A compound secret is searched whole, but a surviving copy of just one part
 * of it -- the password of `alice:supersecret123`, one line of a PEM body --
 * must be found too. So the span is split on whitespace and on `:` `@` `/`
 * `=` and quote characters, each piece is stripped of leading and trailing
 * punctuation, and a piece is kept when it has at least 8 characters and is
 * not purely alphabetic, or when it has at least 24 characters whatever its
 * letters: `supersecret123` and base64 key lines (64 characters, sometimes all
 * letters) are needles, while `PRIVATE`, `BEGIN` or `password` -- words
 * ordinary prose also holds, none that long -- are not. A span shaped like
 * URL credentials (`user:password`, no whitespace) also yields its password
 * whenever it has at least 6 characters, whatever its letters.
 */
export const listConversationSecretTokens = (span: string) => {
  const tokens = span
    .split(/[\s:@/="'`]+/u)
    .map(trimConversationPunctuation)
    .filter(
      (piece) =>
        piece.length >= 24 || (piece.length >= 8 && !/^\p{L}+$/u.test(piece)),
    )
  const credentials = /^[^\s:@/]+:([^\s@/]{6,})$/u.exec(span)
  return credentials?.[1] === undefined ? tokens : [...tokens, credentials[1]]
}
