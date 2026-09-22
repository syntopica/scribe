import type { ConversationSource } from './ConversationSource'
import type { ConversationStorageKind } from './ConversationStorageKind'

export interface ConversationSourceDefinition {
  id: ConversationSource
  label: string
  roots: string[]
  storage: ConversationStorageKind[]
}
