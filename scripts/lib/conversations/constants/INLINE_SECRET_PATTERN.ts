/**
 * A label of up to five words, a colon, then a token-shaped value, optionally
 * quoted or backticked. The label starts after a line start or a delimiter;
 * `_` joins words inside the word class, so only a space separates them.
 */
export const INLINE_SECRET_PATTERN =
  /(?<label>(?<![\p{L}\p{N}_])[A-Za-z][\p{L}\p{N}_.()-]*(?: [\p{L}\p{N}_.()-]+){0,4}) ?: ?(?<quote>[`'"]?)(?<value>(?!\[REDACTED:)[\w+/=.-]{16,})\k<quote>/gu
