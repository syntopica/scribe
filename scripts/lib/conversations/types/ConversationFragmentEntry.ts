import type { ConversationRecord } from './ConversationRecord'

/** One observed revision of one conversation, as it appears inside a segment. */
export interface ConversationFragmentEntry {
  kind: 'conversation-fragment'
  conversationId: string
  fragmentSha256: string
  record: ConversationRecord
  /**
   * Hosts that observed this fragment, beside the record rather than inside
   * it: the hash covers the canonical record only, so a host-only observation
   * of known bytes can be published without minting a second fragment.
   */
  hosts?: string[]
}
