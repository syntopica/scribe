import { hashConversationFragment } from './hashConversationFragment'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { listRecordRedactedSpans } from './listRecordRedactedSpans'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import { redactConversationRecord } from './redactConversationRecord'
import type { ReadConversationRedactionReplacementsOptions } from './types/ReadConversationRedactionReplacementsOptions'

/**
 * What re-redacting the planned fragments of a generation produces, recomputed
 * from the generation itself rather than taken from apply's report.
 *
 * `replaced` maps each planned fragment found to its replacement's hash (equal
 * when the redactor changes nothing). `spans` is the text the redactor took
 * out, which must appear nowhere in the new generation. `stillRedactable`
 * names replacements the redactor would change again: a redactor that is not
 * idempotent left something matching its own patterns behind.
 */
export const readConversationRedactionReplacements = async (
  options: ReadConversationRedactionReplacementsOptions,
) => {
  const { generation, segments } =
    await readConversationArchiveGenerationManifest(
      options.root,
      options.generationId,
    )
  const replaced = new Map<string, string>()
  const spans = new Set<string>()
  const stillRedactable = new Set<string>()
  for (const sha256 of await listConversationArchiveSegments(segments)) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256,
      generation,
    })
    for (const entry of segment.entries) {
      if (!options.planned.has(entry.fragmentSha256)) continue
      const replacement = redactConversationRecord(entry.record)
      const replacementSha256 = hashConversationFragment(replacement)
      replaced.set(entry.fragmentSha256, replacementSha256)
      if (redactConversationRecord(replacement) !== replacement)
        stillRedactable.add(replacementSha256)
      for (const span of listRecordRedactedSpans(entry.record)) spans.add(span)
    }
  }
  return { replaced, spans, stillRedactable }
}
