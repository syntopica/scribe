import { buildConversationEventPrecedence } from './buildConversationEventPrecedence'
import { createRankQueue } from './createRankQueue'
import { listConversationEventsByTime } from './listConversationEventsByTime'
import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Put collected events in the order the source wrote them.
 *
 * Each fragment is one capture's reading of the conversation, in source order,
 * so each consecutive pair it holds is a precedence the result keeps; within
 * one fragment that fixes the whole sequence, even where the source's own
 * timestamps run backwards (Cursor and Claude Code sessions do: sorting by
 * timestamp reordered the user and assistant messages of 2,254 real
 * conversations). A fragment that saw `[B, C]` and one that saw `[A, B, C]`
 * give `A, B, C` whichever was collected first. Only among events no fragment
 * orders -- what two captures saw separately -- does time decide: earliest
 * timestamp first, then first seen in fragment-hash order, so the answer is
 * the same on every host. Fragments that contradict each other form a cycle,
 * broken by the same preference.
 */
export const orderConversationEventsBySource = (
  events: ConversationEvent[],
  fragments: ConversationRecord[],
): ConversationEvent[] => {
  const { after, waiting } = buildConversationEventPrecedence(events, fragments)
  const byTime = listConversationEventsByTime(events)
  const position = events.map(() => 0)
  byTime.forEach((index, at) => {
    position[index] = at
  })
  const placed = events.map(() => false)
  const ready = createRankQueue()
  waiting.forEach((count, index) => {
    if (count === 0) ready.push(position[index] ?? 0)
  })
  const ordered: ConversationEvent[] = []
  // Earliest-preferred position still unplaced, for breaking a cycle; it only
  // ever moves forward.
  let lowest = 0
  while (ordered.length < events.length) {
    while (placed[byTime[lowest] ?? 0]) lowest += 1
    const queued = ready.size() > 0 ? ready.pop() : undefined
    const next = byTime[queued ?? lowest] ?? 0
    if (placed[next]) continue
    placed[next] = true
    const event = events[next]
    if (event !== undefined) ordered.push(event)
    for (const to of after[next] ?? []) {
      waiting[to] = (waiting[to] ?? 0) - 1
      if (waiting[to] === 0 && !placed[to]) ready.push(position[to] ?? 0)
    }
  }
  return ordered
}
