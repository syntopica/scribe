import { isRedactableConversationField } from './isRedactableConversationField'
import { listConversationStringFields } from './listConversationStringFields'
import { listRecordRedactedSpans } from './listRecordRedactedSpans'
import { redactSensitiveText } from './redactSensitiveText'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'

/**
 * Fields of one entry that hold secret text the redactor cannot rewrite: ids,
 * `provenance.relativePath`, hosts and the like. A field counts when the
 * redactor's patterns match it, or when it repeats text the redactor takes
 * out of the record's title, workspace or events. Sorted paths.
 */
export const listUnredactableConversationFields = (
  entry: ConversationFragmentEntry,
) => {
  const spans = listRecordRedactedSpans(entry.record)
  return listConversationStringFields(entry, 'entry')
    .filter(
      ({ path, text }) =>
        !isRedactableConversationField(path) &&
        (redactSensitiveText(text).redactions > 0 ||
          spans.some((span) => text.includes(span))),
    )
    .map(({ path }) => path)
    .toSorted((left, right) => left.localeCompare(right))
}
