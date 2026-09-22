import type { ConversationRewriteChanges } from './ConversationRewriteChanges'

export interface ConversationRewriteResult {
  ok: boolean
  applied: boolean
  archive: string
  homes: string[]
  changes: ConversationRewriteChanges
  backup?: string
  prunedBackups?: string[]
  contentSha256?: string
  errors: string[]
}
