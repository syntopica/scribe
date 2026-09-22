import type { ConversationEvent } from './ConversationEvent'
import type { ConversationProvenance } from './ConversationProvenance'
import type { ConversationSource } from './ConversationSource'

export interface ConversationRecord {
  schemaVersion: 1 | 2
  id: string
  source: ConversationSource
  sourceId: string
  title: string
  events: ConversationEvent[]
  provenance: ConversationProvenance
  startedAt?: string
  updatedAt?: string
  workspace?: string
  /**
   * Labels of the machines that observed this conversation, sorted.
   *
   * Observation, not origin: the Cowork store is account-synced and the two
   * Macs mirror each other's `.claude/projects`, so a host that read the
   * bytes is all a capture can truthfully claim. Outside the fragment
   * identity on purpose - two hosts that captured the same bytes still
   * publish one fragment - and unioned wherever fragments meet.
   */
  hosts?: string[]
}
