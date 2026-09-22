import type { ConversationArtifact } from './types/ConversationArtifact'

/** The three fields a capture cache row is keyed by, in one place. */
export const conversationArtifactKey = (artifact: ConversationArtifact) => ({
  source: artifact.source,
  relativePath: artifact.relativePath,
  storageKind: artifact.storage,
})
