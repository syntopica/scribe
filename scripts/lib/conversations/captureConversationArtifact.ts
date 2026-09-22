import { conversationHomesToRedact } from './conversationHomesToRedact'
import { conversationHostLabel } from './conversationHostLabel'
import { conversationRecordsFromArtifact } from './conversationRecordsFromArtifact'
import { redactConversationHome } from './redactConversationHome'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationArtifactCapture } from './types/ConversationArtifactCapture'

export const captureConversationArtifact = async (
  artifact: ConversationArtifact,
  home: string,
  host = conversationHostLabel(),
): Promise<ConversationArtifactCapture> => {
  try {
    const homes = conversationHomesToRedact(home)
    // Stamped here and nowhere else: a capture is the only place that knows a
    // machine actually read the bytes. An import carries whatever hosts its
    // records already name and adds none.
    const records = (await conversationRecordsFromArtifact(artifact)).map(
      (record) => ({
        ...homes.reduce(
          (redacted, prefix) => redactConversationHome(redacted, prefix),
          record,
        ),
        hosts: [host],
      }),
    )
    return {
      source: artifact.source,
      relativePath: artifact.relativePath,
      records,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown read error'
    return {
      source: artifact.source,
      relativePath: artifact.relativePath,
      records: [],
      error: message,
    }
  }
}
