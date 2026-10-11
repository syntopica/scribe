import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import type { ActivateConversationArchiveGenerationOptions } from './types/ActivateConversationArchiveGenerationOptions'
import type { ConversationArchiveGenerationReference } from './types/ConversationArchiveGenerationReference'

/**
 * Point the archive at a generation it already holds.
 *
 * This is the cutover after an erasure and, run with the old id, its rollback:
 * the old generation stays on disk until a separate purge, so switching back
 * is this same rename in reverse. A generation whose manifest is missing or
 * filed under another id is refused, because a reference to bytes the host
 * does not hold would stop every writer and reader on it.
 *
 * Replacing rename is used for this reference and nothing else. Immutable
 * objects are published by link, which cannot overwrite; which generation is
 * current is the one thing that has to be able to move.
 */
export const activateConversationArchiveGeneration = async (
  options: ActivateConversationArchiveGenerationOptions,
) => {
  await readConversationArchiveGenerationManifest(
    options.root,
    options.generationId,
  )
  const base = resolveConversationSegmentPaths(options.root)
  const reference: ConversationArchiveGenerationReference = {
    kind: 'rocket-agents-conversation-generation-reference',
    schemaVersion: 2,
    generationId: options.generationId,
    updatedAt: options.updatedAt,
  }
  const temporary = `${base.reference}.tmp-${randomUUID()}`
  await fs.writeFile(temporary, `${JSON.stringify(reference)}\n`, {
    mode: 0o600,
  })
  await fs.rename(temporary, base.reference)
  await fsyncConversationDirectory(base.root)
  return reference
}
