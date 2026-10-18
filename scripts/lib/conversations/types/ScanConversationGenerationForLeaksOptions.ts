/**
 * A generation to scan, the redacted-away texts no fragment of it may hold,
 * and the conversations whose fields must not match the redactor at all.
 */
export interface ScanConversationGenerationForLeaksOptions {
  root: string
  generationId: string
  needles: ReadonlySet<string>
  conversationIds: ReadonlySet<string>
}
