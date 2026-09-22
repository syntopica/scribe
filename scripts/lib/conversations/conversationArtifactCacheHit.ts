import type { ConversationArchiveState } from './ConversationArchiveState'
import { conversationArtifactFingerprintsEqual } from './conversationArtifactFingerprintsEqual'
import type { ConversationArtifactFingerprint } from './types/ConversationArtifactFingerprint'

/**
 * Whether a cached capture result may be reused without opening the file.
 *
 * Four claims, all required. The fingerprint says the bytes did not change.
 * The version stamp says this build would still produce the same records from
 * them. The generation says the row was written into the archive that is
 * current. And the presence check says the fragments that row produced are
 * still published -- which is the one a file-only cache omits, and the one
 * that decides whether a reseeded or erased archive ever gets its
 * conversations back.
 */
export const conversationArtifactCacheHit = (options: {
  state: ConversationArchiveState
  key: { source: string; relativePath: string; storageKind: string }
  fingerprint: ConversationArtifactFingerprint
  generationId: string
  captureVersions: string
}) => {
  const cached = options.state.artifact(options.key)
  return (
    cached?.generationId === options.generationId &&
    cached.captureVersions === options.captureVersions &&
    conversationArtifactFingerprintsEqual(
      cached.fingerprint,
      options.fingerprint,
    ) &&
    cached.fragmentHashes.every((hash) => options.state.hasFragment(hash))
  )
}
