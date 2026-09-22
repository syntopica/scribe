import { constants, promises as fs } from 'node:fs'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationDocument } from './types/ConversationDocument'

export const readTextConversationDocument = async (
  artifact: ConversationArtifact,
): Promise<ConversationDocument[]> => {
  const handle = await fs.open(
    artifact.path,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  )
  try {
    const stat = await handle.stat()
    if (!stat.isFile())
      throw new Error(`not a regular file: ${artifact.relativePath}`)
    if (stat.size > MAX_CONVERSATION_FILE_BYTES) {
      throw new Error(`file exceeds 64 MiB limit: ${artifact.relativePath}`)
    }

    return [
      {
        contents: await handle.readFile('utf8'),
        relativePath: artifact.relativePath,
        source: artifact.source,
        sourceIdHint: artifact.relativePath,
      },
    ]
  } finally {
    await handle.close()
  }
}
