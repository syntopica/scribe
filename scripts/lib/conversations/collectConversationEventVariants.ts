import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationEventVariant } from './types/ConversationEventVariant'

/**
 * Group every event by id, keeping each distinct byte form.
 *
 * Separated from the reducer because it answers its own question: what did the
 * fragments actually disagree about? The reducer then decides what to do with
 * the answer, and the two concerns stay readable apart.
 *
 * The chosen form is the lowest canonical bytes, so two machines reach the
 * same record without coordinating. That is availability, not judgement: the
 * conflict is returned alongside so a person can overrule it.
 */
export const collectConversationEventVariants = (
  fragments: { events: ConversationEvent[] }[],
): { events: ConversationEvent[]; conflicts: ConversationEventVariant[] } => {
  const byId = new Map<string, Map<string, ConversationEvent>>()
  for (const fragment of fragments) {
    for (const event of fragment.events) {
      const forms = byId.get(event.id) ?? new Map<string, ConversationEvent>()
      forms.set(JSON.stringify(event), event)
      byId.set(event.id, forms)
    }
  }

  const conflicts: ConversationEventVariant[] = []
  const events: ConversationEvent[] = []
  for (const [id, forms] of byId) {
    const ordered = [...forms.entries()].toSorted(([left], [right]) =>
      left.localeCompare(right),
    )
    const chosen = ordered.at(0)
    if (chosen === undefined) continue
    if (ordered.length > 1) {
      conflicts.push({ id, variants: ordered.map(([, event]) => event) })
    }
    events.push(chosen[1])
  }
  return { events, conflicts }
}
