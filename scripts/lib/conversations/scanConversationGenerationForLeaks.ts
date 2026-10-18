import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { listConversationFieldLeaks } from './listConversationFieldLeaks'
import { listUnredactableConversationFields } from './listUnredactableConversationFields'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationFieldLeak } from './types/ConversationFieldLeak'
import type { ScanConversationGenerationForLeaksOptions } from './types/ScanConversationGenerationForLeaksOptions'

/**
 * Every field of a generation that still leaks what a redaction removed.
 *
 * `needles` are searched in every string of every entry -- ids, paths and
 * hosts included, not only the fields the redactor rewrites -- and the entries
 * of `conversationIds` are also checked for fields the redactor's patterns
 * still match but cannot rewrite. Read-only, one segment at a time.
 */
export const scanConversationGenerationForLeaks = async (
  options: ScanConversationGenerationForLeaksOptions,
) => {
  const { generation, segments } =
    await readConversationArchiveGenerationManifest(
      options.root,
      options.generationId,
    )
  const needles = [...options.needles]
  const containing: ConversationFieldLeak[] = []
  const unredactable: ConversationFieldLeak[] = []
  for (const sha256 of await listConversationArchiveSegments(segments)) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256,
      generation,
    })
    for (const entry of segment.entries) {
      containing.push(...listConversationFieldLeaks(entry, needles))
      if (!options.conversationIds.has(entry.conversationId)) continue
      for (const field of listUnredactableConversationFields(entry))
        unredactable.push({ fragmentSha256: entry.fragmentSha256, field })
    }
  }
  return { containing, unredactable }
}
