/**
 * The first line of every segment.
 *
 * It states the generation and the schema its entries follow. A header may
 * never claim a schema newer than the entries beneath it: a reader that trusts
 * the header assumes qualified event ids and finds unqualified ones. That
 * exact state existed in the v1 archive on 2026-08-31 and nothing detected it,
 * which is why validation checks it rather than documenting it.
 */
export interface ConversationSegmentHeader {
  kind: 'rocket-agents-conversation-segment'
  schemaVersion: 2
  generationId: string
  createdAt: string
  entryCount: number
}
