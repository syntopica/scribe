import type { ConversationSource } from './ConversationSource'

export interface ConversationDocument {
  contents: string
  relativePath: string
  source: ConversationSource
  sourceIdHint: string
}
