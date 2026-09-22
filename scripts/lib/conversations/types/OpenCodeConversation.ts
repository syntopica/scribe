export interface OpenCodeConversation {
  metadata: Record<string, unknown>
  messages: Map<string, Record<string, unknown>>
}
