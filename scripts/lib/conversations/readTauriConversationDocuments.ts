import { constants, promises as fs } from 'node:fs'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'
import { parseTauriConversationStore } from './parseTauriConversationStore'
import type { ConversationArtifact } from './types/ConversationArtifact'

export const readTauriConversationDocuments = async (
  artifact: ConversationArtifact,
) => {
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
    return parseTauriConversationStore(await handle.readFile())
      .filter(({ value }) => typeof value === 'object' && value !== null)
      .flatMap(({ key, value }) => {
        const object = value as Record<string, unknown>
        if (
          !Array.isArray(object['messages']) &&
          !Array.isArray(object['history'])
        )
          return []
        return [
          {
            contents: JSON.stringify({ ...object, storeKey: key }),
            relativePath: `${artifact.relativePath}#${key}`,
            source: artifact.source,
            sourceIdHint: key,
          },
        ]
      })
  } finally {
    await handle.close()
  }
}
