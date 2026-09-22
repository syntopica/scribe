/**
 * The last line of every segment, and the reason a truncated one is detectable.
 *
 * A segment without a valid footer was never completely written. Publication
 * names the file by its hash only after the footer is on disk, so a reader
 * never has to decide whether a partial object is usable -- it either has a
 * complete segment or no segment.
 */
export interface ConversationSegmentFooter {
  kind: 'rocket-agents-conversation-segment-footer'
  entryCount: number
  payloadSha256: string
}
