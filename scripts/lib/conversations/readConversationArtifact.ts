import { readSqliteConversationDocuments } from './readSqliteConversationDocuments'
import { readTauriConversationDocuments } from './readTauriConversationDocuments'
import { readTextConversationDocument } from './readTextConversationDocument'
import type { ConversationArtifact } from './types/ConversationArtifact'

export const readConversationArtifact = async (
  artifact: ConversationArtifact,
) => {
  if (artifact.storage === 'sqlite')
    return readSqliteConversationDocuments(artifact)
  if (artifact.storage === 'tauri')
    return readTauriConversationDocuments(artifact)
  return readTextConversationDocument(artifact)
}
