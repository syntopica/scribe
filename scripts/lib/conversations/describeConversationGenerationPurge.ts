import { promises as fs } from 'node:fs'
import { measureDirectoryBytes } from './measureDirectoryBytes'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { refuseConversationGenerationPurge } from './refuseConversationGenerationPurge'
import type { ConversationGenerationPurge } from './types/ConversationGenerationPurge'
import type { DescribeConversationGenerationPurgeOptions } from './types/DescribeConversationGenerationPurgeOptions'

/**
 * What purging a generation would remove, read without changing anything.
 *
 * The target must be a real generation filed under its own id; the archive's
 * selected generation is read to refuse it and its rollback target.
 */
export const describeConversationGenerationPurge = async (
  options: DescribeConversationGenerationPurgeOptions,
): Promise<ConversationGenerationPurge> => {
  const { paths, segments } = await readConversationArchiveGenerationManifest(
    options.root,
    options.generationId,
  )
  if (paths.generation === undefined)
    throw new Error('generation paths were not resolved')
  const selected = await readConversationArchiveGeneration(options.root)
  const refusal = refuseConversationGenerationPurge(
    options.generationId,
    selected.generation,
    options.includeRollback,
  )
  return {
    generationId: options.generationId,
    directory: paths.generation,
    segments: (await fs.readdir(segments)).length,
    bytes: await measureDirectoryBytes(paths.generation),
    ...(refusal === undefined ? {} : { refusal }),
  }
}
