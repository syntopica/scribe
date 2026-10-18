import { conversationRedactorSha256 } from './conversationRedactorSha256'
import { hashConversationSegmentSet } from './hashConversationSegmentSet'
import { isRedactableConversationField } from './isRedactableConversationField'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationGenerationFragmentHashes } from './readConversationGenerationFragmentHashes'
import { readConversationRedactionReplacements } from './readConversationRedactionReplacements'
import { scanConversationGenerationForLeaks } from './scanConversationGenerationForLeaks'
import type { VerifyConversationArchiveErasureOptions } from './types/VerifyConversationArchiveErasureOptions'

/**
 * Prove a new generation is the old one minus exactly what the plan named.
 *
 * Both generations are read in full and compared as fragment sets: the new
 * one must hold no fragment the plan removed, every fragment the plan kept,
 * and nothing else. Fragments are whole records, so set equality is semantic
 * equality for everything the plan did not target. Each segment is read
 * through the generation barrier, so a segment copied in from another
 * generation surfaces here as a problem instead of being counted.
 *
 * The old generation must also still hold exactly the segment set the plan was
 * computed from: a capture appended to it since would be missing from the new
 * one, and cutting over would drop it.
 *
 * A redaction plan is checked against what the current redactor makes of the
 * planned fragments, recomputed from the old generation: the new one is the
 * old minus the fragments it changes plus exactly their replacements, no
 * replacement still matches the redactor's patterns, and no text the redactor
 * took out appears in any string of any fragment of the new generation, ids,
 * paths and hosts included. A secret in a field the redactor cannot rewrite is
 * named as an unredactable-field problem. A redactor changed
 * since the plan cannot reproduce it, and is a problem.
 *
 * Read-only. It is the gate before cutover, and again after a peer is seeded.
 */
export const verifyConversationArchiveErasure = async (
  options: VerifyConversationArchiveErasureOptions,
) => {
  const before = await readConversationGenerationFragmentHashes(
    options.root,
    options.plan.fromGenerationId,
  )
  const after = await readConversationGenerationFragmentHashes(
    options.root,
    options.generationId,
  )
  const planned = new Set(
    options.plan.conversations.flatMap((entry) => entry.removedFragmentSha256),
  )
  const redacting = options.plan.reason === 'redaction'
  const readable = before.problems.length === 0 && after.problems.length === 0
  const redaction =
    redacting && readable
      ? await readConversationRedactionReplacements({
          root: options.root,
          generationId: options.plan.fromGenerationId,
          planned,
        })
      : undefined
  const replaced = redaction?.replaced ?? new Map<string, string>()
  const unchanged = new Set(
    [...replaced].filter(([from, to]) => from === to).map(([from]) => from),
  )
  const replacements = new Set(
    [...replaced.values()].filter((sha256) => !unchanged.has(sha256)),
  )
  const removing = new Set([...planned].filter((hash) => !unchanged.has(hash)))
  const expected = new Set([
    ...[...before.fragments].filter((hash) => !removing.has(hash)),
    ...replacements,
  ])
  const removedPresent = [...removing]
    .filter((hash) => after.fragments.has(hash) && !replacements.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const keptMissing = [...expected]
    .filter((hash) => !after.fragments.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const unexpected = [...after.fragments]
    .filter((hash) => !expected.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const stillRedactable = [...(redaction?.stillRedactable ?? [])].toSorted(
    (left, right) => left.localeCompare(right),
  )
  const leaks =
    redaction === undefined
      ? { containing: [], unredactable: [] }
      : await scanConversationGenerationForLeaks({
          root: options.root,
          generationId: options.generationId,
          needles: redaction.spans,
          conversationIds: new Set(options.plan.conversationIds),
        })
  const secretsPresent = [
    ...new Set(leaks.containing.map((leak) => leak.fragmentSha256)),
  ].toSorted((left, right) => left.localeCompare(right))
  const unredactable = [
    ...leaks.containing.filter(
      (leak) => !isRedactableConversationField(leak.field),
    ),
    ...leaks.unredactable,
  ].map(
    (leak) =>
      `fragment ${leak.fragmentSha256}: unredactable field ${leak.field} holds secret text the redactor cannot rewrite`,
  )
  const source = await readConversationArchiveGenerationManifest(
    options.root,
    options.plan.fromGenerationId,
  )
  const segmentSetMoved =
    hashConversationSegmentSet(
      await listConversationArchiveSegments(source.segments),
    ) !== options.plan.segmentSetSha256
  const problems = [
    ...before.problems,
    ...after.problems,
    ...(segmentSetMoved
      ? [
          `generation ${options.plan.fromGenerationId}: its segment set is no longer the one the plan was computed from`,
        ]
      : []),
    ...(redacting &&
    options.plan.redactorSha256 !== conversationRedactorSha256()
      ? [
          'the redactor has changed since the plan was computed, so its replacements cannot be reproduced',
        ]
      : []),
    ...new Set(unredactable),
  ]

  return {
    ok:
      problems.length === 0 &&
      removedPresent.length === 0 &&
      keptMissing.length === 0 &&
      unexpected.length === 0 &&
      stillRedactable.length === 0 &&
      secretsPresent.length === 0,
    fromGenerationId: options.plan.fromGenerationId,
    generationId: options.generationId,
    fragmentsBefore: before.fragments.size,
    fragmentsAfter: after.fragments.size,
    removedPresent,
    keptMissing,
    unexpected,
    ...(redacting
      ? {
          fragmentsReplaced: replacements.size,
          unchanged: [...unchanged].toSorted((left, right) =>
            left.localeCompare(right),
          ),
          stillRedactable,
          secretsPresent,
        }
      : {}),
    problems,
  }
}
