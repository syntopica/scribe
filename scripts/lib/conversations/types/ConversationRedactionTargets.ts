/** Where planning a redaction collects what it found, entry by entry. */
export interface ConversationRedactionTargets {
  redactable: string[]
  unredactableConversationIds?: Set<string>
}
