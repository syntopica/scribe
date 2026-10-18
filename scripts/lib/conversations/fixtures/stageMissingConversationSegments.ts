import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { listConversationArchiveSegments } from '../listConversationArchiveSegments'
import { readConversationArchiveGeneration } from '../readConversationArchiveGeneration'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'

/**
 * What the dotfiles transport does before calling receive: copy the segment
 * names `to` lacks from `from`'s active generation into a fresh staging
 * directory, and report the sender's generation id.
 */
export const stageMissingConversationSegments = async (
  context: TestCleanupContext,
  from: string,
  to: string,
) => {
  const staging = await createConversationScratchDirectory(
    context,
    'segments-staging-',
  )
  const source = await readConversationArchiveGeneration(from)
  const target = await readConversationArchiveGeneration(to)
  const held = new Set(await listConversationArchiveSegments(target.segments))
  const missing = (
    await listConversationArchiveSegments(source.segments)
  ).filter((sha256) => !held.has(sha256))
  for (const sha256 of missing) {
    await fs.copyFile(
      join(source.segments, `s_${sha256}.jsonl`),
      join(staging, `s_${sha256}.jsonl`),
    )
  }
  return { staging, missing, generationId: source.generation.generationId }
}
