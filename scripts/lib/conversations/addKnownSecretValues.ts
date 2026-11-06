import { isKnownSecretCandidate } from './isKnownSecretCandidate'
import { listRecordRedactedSpans } from './listRecordRedactedSpans'
import type { ConversationRecord } from './types/ConversationRecord'

/** Add to `values` every token-shaped value the pattern redactor removes from one record. */
export const addKnownSecretValues = (
  record: ConversationRecord,
  values: Set<string>,
) => {
  for (const span of listRecordRedactedSpans(record))
    if (isKnownSecretCandidate(span)) values.add(span)
}
