import { promises as fs } from 'node:fs'
import type { ConversationArchiveDigests } from './types/ConversationArchiveDigests'
import { verifyConversationSegmentArchive } from './verifyConversationSegmentArchive'

/**
 * `verify-segments` on `root`, reduced to its problems and its five digests,
 * with the verifier's throwaway state kept in `scratchDirectory`.
 */
export const readConversationArchiveDigests = async (
  root: string,
  scratchDirectory: string,
) => {
  await fs.mkdir(scratchDirectory, { recursive: true, mode: 0o700 })
  const verified = await verifyConversationSegmentArchive({
    root,
    scratchDirectory,
  })
  const digests: ConversationArchiveDigests = {
    generationId: verified.generationId,
    ...verified.digests,
  }
  return { problems: verified.problems, digests }
}
