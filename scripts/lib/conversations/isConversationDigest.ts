/**
 * True for a 64-character lowercase hex digest: a generation id, a segment or
 * fragment hash. Ids read from a file become path segments, so anything else
 * is refused before it can name a path outside the archive.
 */
export const isConversationDigest = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
