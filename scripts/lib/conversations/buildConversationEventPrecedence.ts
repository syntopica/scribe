import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * The precedences the fragments assert, over `events` by index: for each event,
 * the events some fragment placed right after it, and how many events must
 * still be placed before it.
 */
export const buildConversationEventPrecedence = (
  events: ConversationEvent[],
  fragments: ConversationRecord[],
) => {
  const rank = new Map(events.map((event, index) => [event.id, index]))
  const after = events.map((): number[] => [])
  const waiting = events.map(() => 0)
  const seen = new Set<string>()
  for (const fragment of fragments) {
    const ranks = fragment.events.map((event) => rank.get(event.id))
    for (let index = 1; index < ranks.length; index += 1) {
      const from = ranks[index - 1]
      const to = ranks[index]
      const edge = `${String(from)} ${String(to)}`
      if (from === undefined || to === undefined || from === to) continue
      if (seen.has(edge)) continue
      seen.add(edge)
      after[from]?.push(to)
      waiting[to] = (waiting[to] ?? 0) + 1
    }
  }
  return { after, waiting }
}
