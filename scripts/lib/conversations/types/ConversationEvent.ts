import type { ConversationEventKind } from './ConversationEventKind'
import type { ConversationRole } from './ConversationRole'

export interface ConversationEvent {
  id: string
  kind: ConversationEventKind
  role: ConversationRole
  text: string
  timestamp?: string
}
