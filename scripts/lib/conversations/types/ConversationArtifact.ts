import type { ConversationSource } from './ConversationSource'
import type { ConversationStorageKind } from './ConversationStorageKind'

export interface ConversationArtifact {
  path: string
  relativePath: string
  source: ConversationSource
  storage: ConversationStorageKind
}
