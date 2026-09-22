import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'
import type { CursorConversation } from './types/CursorConversation'

export const cursorDocumentsFromConversations = (
  artifact: ConversationArtifact,
  conversations: ReadonlyMap<string, CursorConversation>,
) => {
  const documents: ConversationDocument[] = []
  for (const [composerId, conversation] of conversations) {
    if (conversation.messages.length === 0) continue
    documents.push({
      contents: JSON.stringify({
        sessionId: composerId,
        metadata: conversation.metadata,
        messages: conversation.messages,
      }),
      relativePath: `${artifact.relativePath}#composer:${composerId}`,
      source: artifact.source,
      sourceIdHint: composerId,
    })
  }
  return documents
}
