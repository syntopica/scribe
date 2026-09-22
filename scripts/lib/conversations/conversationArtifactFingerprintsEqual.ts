import type { ConversationArtifactFingerprint } from './types/ConversationArtifactFingerprint'

/**
 * Exact equality over every field, with no tolerance anywhere.
 *
 * There is no field here where "close enough" is safe: a one-nanosecond
 * difference in ctime is a write, and a changed inode is a different file
 * wearing the same name.
 */
export const conversationArtifactFingerprintsEqual = (
  left: ConversationArtifactFingerprint | undefined,
  right: ConversationArtifactFingerprint | undefined,
) => {
  if (left === undefined || right === undefined) return false
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.birthtimeNs === right.birthtimeNs &&
    left.sidecars.length === right.sidecars.length &&
    left.sidecars.every((sidecar, index) => {
      const other = right.sidecars[index]
      return (
        sidecar.name === other?.name &&
        sidecar.size === other.size &&
        sidecar.mtimeNs === other.mtimeNs
      )
    })
  )
}
