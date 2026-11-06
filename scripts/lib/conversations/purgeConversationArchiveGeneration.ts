import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'

/**
 * Remove one generation's directory from disk.
 *
 * It is first renamed out of its `g_<id>` name, so an interrupted removal
 * leaves a hidden `.purging-` directory rather than a generation with half its
 * segments that a rollback could select. The caller has already refused the
 * selected generation and the rollback target under the archive write lock.
 */
export const purgeConversationArchiveGeneration = async (
  root: string,
  generationId: string,
) => {
  const paths = resolveConversationSegmentPaths(root, generationId)
  if (paths.generation === undefined)
    throw new Error('generation paths were not resolved')
  const doomed = join(
    paths.generations,
    `.purging-${generationId}-${randomUUID()}`,
  )
  await fs.rename(paths.generation, doomed)
  await fsyncConversationDirectory(paths.generations)
  await fs.rm(doomed, { recursive: true })
}
