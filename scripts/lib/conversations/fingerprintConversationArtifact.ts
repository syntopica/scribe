import { constants, promises as fs } from 'node:fs'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationArtifactFingerprint } from './types/ConversationArtifactFingerprint'

/**
 * Stat an artifact the way a cache is allowed to trust.
 *
 * `O_NOFOLLOW` because a symlink swapped in under a known path would otherwise
 * let one file's fingerprint vouch for another's contents. The stat comes from
 * the open descriptor rather than the path, so the answer describes the file
 * that will actually be read.
 *
 * A SQLite artifact is three files. Its main database can sit untouched for
 * hours while every write lands in the write-ahead log, so the sidecars are
 * part of the fingerprint; without them a live Cursor database looks unchanged
 * for as long as it is busiest.
 */
export const fingerprintConversationArtifact = async (
  artifact: ConversationArtifact,
): Promise<ConversationArtifactFingerprint | undefined> => {
  const handle = await fs
    .open(artifact.path, constants.O_RDONLY | constants.O_NOFOLLOW)
    .catch(() => undefined)
  if (handle === undefined) return undefined
  try {
    const stats = await handle.stat({ bigint: true })
    const sidecars = []
    for (const suffix of artifact.storage === 'sqlite'
      ? ['-wal', '-shm']
      : []) {
      const sidecar = await fs
        .stat(`${artifact.path}${suffix}`, { bigint: true })
        .catch(() => undefined)
      sidecars.push({
        name: suffix,
        size: String(sidecar?.size ?? -1n),
        mtimeNs: String(sidecar?.mtimeNs ?? -1n),
      })
    }
    return {
      device: String(stats.dev),
      inode: String(stats.ino),
      size: String(stats.size),
      mtimeNs: String(stats.mtimeNs),
      ctimeNs: String(stats.ctimeNs),
      birthtimeNs: String(stats.birthtimeNs),
      sidecars,
    }
  } finally {
    await handle.close()
  }
}
