import type { ConversationEvent } from './ConversationEvent'

/**
 * Every distinct byte form seen for one event id, kept rather than resolved.
 *
 * Two captures can carry the same event id with different bytes: the id hashes
 * the event's index and redacted text, so a change to how kind, role or
 * timestamp are derived produces a collision the id cannot see. Two machines
 * sit on different commits between deploys, so this is a normal condition, not
 * corruption -- and dropping either side silently is how a normaliser change
 * quietly rewrites history.
 */
export interface ConversationEventVariant {
  id: string
  variants: ConversationEvent[]
}
