import { collectKnownSecretValues } from './collectKnownSecretValues'
import { createKnownSecretRedactor } from './createKnownSecretRedactor'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { noteConversationRedactionTarget } from './noteConversationRedactionTarget'
import { planConversationArchiveErasure } from './planConversationArchiveErasure'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'
import type { ConversationFragmentReference } from './types/ConversationFragmentReference'
import type { PlanConversationArchiveErasureFromRootOptions } from './types/PlanConversationArchiveErasureFromRootOptions'

/**
 * Plan an erasure against the archive's current generation, in bounded memory.
 *
 * Segments are read one at a time and only each entry's conversation id and
 * fragment hash are kept, so the plan costs a few dozen bytes per fragment
 * rather than the corpus. Every segment is read through the generation
 * barrier: a plan computed over a segment from another generation would bind
 * itself to a corpus apply will refuse.
 *
 * A redaction plan runs the current redactor over every requested fragment
 * and plans only those it would change: Atrium drops the derived records of
 * every conversation a plan names, so naming a clean one costs a re-synthesis
 * for nothing. Requested conversations with secret text in a field the
 * redactor cannot rewrite are reported into `unredactableConversationIds`.
 * A first pass collects every value the pattern redactor removes from the
 * requested fragments, and a fragment holding a bare copy of one is planned
 * too (`collectKnownSecretValues`).
 */
export const planConversationArchiveErasureFromRoot = async (
  options: PlanConversationArchiveErasureFromRootOptions,
) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const present = await listConversationArchiveSegments(segments)
  const requestedConversations = new Set(options.removeConversationIds ?? [])
  const requestedFragments = new Set(options.removeFragmentSha256 ?? [])
  const redacting = options.reason === 'redaction'
  const targets = {
    redactable: [] as string[],
    ...(options.unredactableConversationIds === undefined
      ? {}
      : { unredactableConversationIds: options.unredactableConversationIds }),
  }
  const requested = (entry: ConversationFragmentEntry) =>
    requestedConversations.has(entry.conversationId) ||
    requestedFragments.has(entry.fragmentSha256)
  const redactKnown = createKnownSecretRedactor(
    redacting
      ? await collectKnownSecretValues({
          segmentsDirectory: segments,
          segmentSha256: present,
          generation,
          includes: requested,
        })
      : [],
  )
  const entries: ConversationFragmentReference[] = []
  for (const sha256 of present) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256,
      generation,
    })
    for (const entry of segment.entries) {
      entries.push({
        conversationId: entry.conversationId,
        fragmentSha256: entry.fragmentSha256,
      })
      const conversationRequested = requestedConversations.has(
        entry.conversationId,
      )
      if (conversationRequested)
        options.matchedConversationIds?.add(entry.conversationId)
      if (redacting && requested(entry))
        noteConversationRedactionTarget(entry, targets, redactKnown)
    }
  }
  return planConversationArchiveErasure({
    entries,
    segmentSha256: present,
    fromGenerationId: generation.generationId,
    createdAt: options.createdAt,
    reason: options.reason,
    ...(redacting
      ? { removeFragmentSha256: targets.redactable }
      : {
          removeFragmentSha256: [...requestedFragments],
          removeConversationIds: [...requestedConversations],
        }),
  })
}
