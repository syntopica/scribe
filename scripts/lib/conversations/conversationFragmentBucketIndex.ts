/**
 * Which base segment a fragment belongs in, decided by the fragment itself.
 *
 * Migration streams a four-gigabyte archive it cannot hold in memory, so the
 * split has to be decidable one record at a time and identical on every host
 * that migrates the same corpus. Taking it from the fragment hash gives both,
 * and spreads evenly because the input is a hash.
 *
 * The alternative -- cutting the stream into fixed runs of N records -- would
 * make the base segments depend on the order the file happened to be written
 * in, and two hosts migrating the same conversations would produce different
 * base bytes, different hashes, and therefore different generation ids for the
 * same archive.
 */
export const conversationFragmentBucketIndex = (
  fragmentSha256: string,
  buckets: number,
) => Number.parseInt(fragmentSha256.slice(0, 4), 16) % buckets
