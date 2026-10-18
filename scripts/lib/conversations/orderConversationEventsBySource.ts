import { buildConversationEventPrecedence } from './buildConversationEventPrecedence'
import { createRankQueue } from './createRankQueue'
import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Put collected events in an order every fragment agrees with.
 *
 * Each fragment is one capture's reading of the conversation, in the order the
 * source wrote it, so each consecutive pair it holds is a precedence the
 * result must keep. A fragment that saw `[B, C]` and one that saw `[A, B, C]`
 * must give `A, B, C` whichever was collected first; a plain first-seen order
 * gives `B, C, A`. Among events free to go next, the one seen first (in the
 * fragment-hash order `events` was collected in) goes first, so the answer is
 * the same on every host. Fragments that contradict each other form a cycle,
 * broken the same way. The caller then sorts stably by timestamp, so this
 * order only decides events that share one.
 */
export const orderConversationEventsBySource = (
  events: ConversationEvent[],
  fragments: ConversationRecord[],
): ConversationEvent[] => {
  const { after, waiting } = buildConversationEventPrecedence(events, fragments)
  const placed = events.map(() => false)
  const ready = createRankQueue()
  waiting.forEach((count, rank) => {
    if (count === 0) ready.push(rank)
  })
  const ordered: ConversationEvent[] = []
  // Lowest unplaced rank, for breaking a cycle; it only ever moves forward.
  let lowest = 0
  while (ordered.length < events.length) {
    while (placed[lowest]) lowest += 1
    const queued = ready.size() > 0 ? ready.pop() : undefined
    const next = queued ?? lowest
    if (placed[next]) continue
    placed[next] = true
    const event = events[next]
    if (event !== undefined) ordered.push(event)
    for (const to of after[next] ?? []) {
      waiting[to] = (waiting[to] ?? 0) - 1
      if (waiting[to] === 0 && !placed[to]) ready.push(to)
    }
  }
  return ordered
}
