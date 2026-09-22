/**
 * Enough of a file's identity to prove it did not change, in decimal strings.
 *
 * Nanosecond times and inode numbers exceed what a double can hold exactly, so
 * they are carried as the decimal form of a bigint rather than a number; a
 * fingerprint that silently rounded would compare equal to a file it does not
 * describe.
 *
 * `path + size + mtime` is not enough on its own: an in-place rewrite of the
 * same length can restore mtime, and a SQLite writer can leave the main
 * database untouched while the write sits in the WAL. Hence ctime, birth time,
 * device and inode, and the sidecar fingerprints.
 */
export interface ConversationArtifactFingerprint {
  device: string
  inode: string
  size: string
  mtimeNs: string
  ctimeNs: string
  birthtimeNs: string
  sidecars: { name: string; size: string; mtimeNs: string }[]
}
