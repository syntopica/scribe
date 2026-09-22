import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'
import type { OpenCodeConversation } from './types/OpenCodeConversation'

export const openCodeDocumentsFromConversations = (
  artifact: ConversationArtifact,
  conversations: ReadonlyMap<string, OpenCodeConversation>,
) => {
  const documents: ConversationDocument[] = []
  for (const [sessionId, conversation] of conversations) {
    documents.push({
      contents: JSON.stringify({
        ...conversation.metadata,
        messages: [...conversation.messages.values()],
      }),
      relativePath: `${artifact.relativePath}#session:${sessionId}`,
      source: artifact.source,
      sourceIdHint: sessionId,
    })
  }
  return documents
}
