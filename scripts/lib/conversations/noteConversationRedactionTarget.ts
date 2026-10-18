import { listUnredactableConversationFields } from './listUnredactableConversationFields'
import { redactConversationRecord } from './redactConversationRecord'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'
import type { ConversationRedactionTargets } from './types/ConversationRedactionTargets'

/**
 * Record one requested entry of a redaction: its hash when the current
 * redactor would change it, its conversation when it holds secret text in a
 * field the redactor cannot rewrite.
 */
export const noteConversationRedactionTarget = (
  entry: ConversationFragmentEntry,
  targets: ConversationRedactionTargets,
) => {
  // The redactor returns the same object when it finds nothing to change.
  if (redactConversationRecord(entry.record) !== entry.record)
    targets.redactable.push(entry.fragmentSha256)
  if (listUnredactableConversationFields(entry).length > 0)
    targets.unredactableConversationIds?.add(entry.conversationId)
}
