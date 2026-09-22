export interface ConversationImportResult {
  ok: boolean
  applied: boolean
  added: number
  duplicates: number
  updated: number
  total: number
  archive: string
  backup?: string
  prunedBackups?: string[]
  errors: string[]
}
