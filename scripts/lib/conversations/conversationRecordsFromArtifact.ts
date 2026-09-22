import { conversationRecordFromDocument } from './conversationRecordFromDocument'
import { exceedsConversationFileBound } from './exceedsConversationFileBound'
import { readConversationArtifact } from './readConversationArtifact'
import { streamJsonlConversationRecord } from './streamJsonlConversationRecord'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * A file over the 64 MiB bound is normalized by streaming its lines instead of
 * being skipped; everything within the bound keeps the whole-document path,
 * which unwraps containers and tolerates artifacts that are pretty-printed
 * rather than line-delimited. A `.jsonl` artifact that is over the bound and
 * not line-delimited still fails, and is reported as a skip.
 */
export const conversationRecordsFromArtifact = async (
  artifact: ConversationArtifact,
): Promise<ConversationRecord[]> => {
  if (
    artifact.storage === 'jsonl' &&
    (await exceedsConversationFileBound(artifact.path))
  ) {
    const record = await streamJsonlConversationRecord(artifact)
    return record === undefined ? [] : [record]
  }

  return (await readConversationArtifact(artifact)).flatMap((document) => {
    const record = conversationRecordFromDocument(document)
    return record === undefined ? [] : [record]
  })
}
