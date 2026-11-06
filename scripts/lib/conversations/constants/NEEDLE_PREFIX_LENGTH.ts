/**
 * The window a needle matcher hashes: every needle at least this long is found
 * by its first characters, and shorter ones fall back to a plain search.
 * Redacted values are 8 characters or more but for a few URL credentials.
 */
export const NEEDLE_PREFIX_LENGTH = 8
