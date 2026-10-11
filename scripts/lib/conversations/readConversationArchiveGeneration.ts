import { promises as fs } from 'node:fs'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import type { ConversationArchiveGenerationReference } from './types/ConversationArchiveGenerationReference'

/**
 * Resolve which generation an archive is currently on, or say why it cannot.
 *
 * Two files have to agree: the mutable reference that selects a generation and
 * the immutable manifest inside it. Disagreement means an interrupted erasure
 * cutover rather than a normal state, and every writer must stop there instead
 * of appending into a generation nothing points at.
 */
export const readConversationArchiveGeneration = async (root: string) => {
  const base = resolveConversationSegmentPaths(root)
  const referenceJson = JSON.parse(
    await fs.readFile(base.reference, 'utf8'),
  ) as unknown
  if (
    (referenceJson as { kind?: unknown }).kind !==
    'rocket-agents-conversation-generation-reference'
  ) {
    throw new Error('current-generation.json is not a generation reference')
  }
  const reference = referenceJson as ConversationArchiveGenerationReference
  return readConversationArchiveGenerationManifest(root, reference.generationId)
}
