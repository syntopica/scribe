import { promises as fs } from 'node:fs'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'
import type { KindTaggedValue } from './types/KindTaggedValue'

/**
 * Read one generation's manifest by id, whether or not it is the current one.
 *
 * An erasure verifies its new generation before anything points at it, and a
 * rollback selects an old one again, so both need to open a generation the
 * reference does not name. The manifest must name the directory it was found
 * in: one filed under another id is a copy gone wrong, not a generation.
 */
export const readConversationArchiveGenerationManifest = async (
  root: string,
  generationId: string,
) => {
  const paths = resolveConversationSegmentPaths(root, generationId)
  if (paths.manifest === undefined || paths.segments === undefined) {
    throw new Error('generation paths were not resolved')
  }
  const generationJson = JSON.parse(
    await fs.readFile(paths.manifest, 'utf8'),
  ) as unknown
  if (
    (generationJson as KindTaggedValue).kind !==
    'rocket-agents-conversation-generation'
  ) {
    throw new Error('generation.json is not a generation manifest')
  }
  const generation = generationJson as ConversationArchiveGeneration
  if (generation.generationId !== generationId) {
    throw new Error(
      `generation ${generation.generationId} is filed under ${generationId}`,
    )
  }
  return { generation, paths, segments: paths.segments }
}
