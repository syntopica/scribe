import { readConversationGenerationFragmentHashes } from './readConversationGenerationFragmentHashes'
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
  const removedPresent = [...planned]
    .filter((hash) => after.fragments.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const keptMissing = [...before.fragments]
    .filter((hash) => !planned.has(hash) && !after.fragments.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const unexpected = [...after.fragments]
    .filter((hash) => !before.fragments.has(hash))
    .toSorted((left, right) => left.localeCompare(right))
  const problems = [...before.problems, ...after.problems]

  return {
    ok:
      problems.length === 0 &&
      removedPresent.length === 0 &&
      keptMissing.length === 0 &&
      unexpected.length === 0,
    fromGenerationId: options.plan.fromGenerationId,
    generationId: options.generationId,
    fragmentsBefore: before.fragments.size,
    fragmentsAfter: after.fragments.size,
    removedPresent,
    keptMissing,
    unexpected,
    problems,
  }
}
