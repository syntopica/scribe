import { canonicalConversationRelativePaths } from './canonicalConversationRelativePaths'
import { hashText } from './hashText'
import type { ConversationProvenance } from './types/ConversationProvenance'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Describe where a materialized record came from, over the whole set at once.
 *
 * The old pairwise merge hashed two provenance hashes and nested the result,
 * which made the answer depend on grouping: three fragments merged as
 * `(a+b)+c` and `a+(b+c)` produced different hashes for the same set. Hashing
 * the sorted fragment hashes in one pass is what makes the reducer
 * associative, and therefore what lets two hosts converge.
 */
export const deriveConversationFragmentSetProvenance = (
  fragments: { hash: string; record: ConversationRecord }[],
): ConversationProvenance => ({
  contentSha256: hashText(fragments.map(({ hash }) => hash).join('\n')),
  relativePath: canonicalConversationRelativePaths(
    fragments.flatMap(({ record }) => record.provenance.relativePath),
  ),
  redactions: fragments.reduce(
    (total, { record }) => total + record.provenance.redactions,
    0,
  ),
})
