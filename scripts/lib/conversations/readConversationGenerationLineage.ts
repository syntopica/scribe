import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'

/**
 * The ancestors of a generation, newest first, as far as this installation can
 * prove them.
 *
 * Each manifest names its parent; the walk follows those names through the
 * manifests held under `root`. It ends at a generation that records no parent
 * (migrated from v1, initialized empty, or sealed before parents were
 * recorded) or whose manifest is no longer held, for example after a purge.
 * A shorter lineage is therefore possible; a wrong one is not, because every
 * id in it was read from a manifest on disk.
 */
export const readConversationGenerationLineage = async (
  root: string,
  generation: ConversationArchiveGeneration,
) => {
  const lineage: string[] = []
  const seen = new Set([generation.generationId])
  let parent = generation.parentGenerationId
  while (parent !== undefined && !seen.has(parent)) {
    seen.add(parent)
    const held = await readConversationArchiveGenerationManifest(
      root,
      parent,
    ).catch(() => undefined)
    if (held === undefined) break
    lineage.push(parent)
    parent = held.generation.parentGenerationId
  }
  return lineage
}
