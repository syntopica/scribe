import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'

/**
 * Copy one generation of `from` into a fresh staging directory in the archive
 * layout `segments-seed-generation` reads.
 */
export const stageConversationGeneration = async (
  context: TestCleanupContext,
  from: string,
  generationId: string,
) => {
  const staging = await createConversationScratchDirectory(
    context,
    'generation-staging-',
  )
  const relative = join('generations', `g_${generationId}`)
  await fs.cp(join(from, relative), join(staging, relative), {
    recursive: true,
  })
  return staging
}
