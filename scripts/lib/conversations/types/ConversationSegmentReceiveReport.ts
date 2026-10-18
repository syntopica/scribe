/**
 * What `segments-receive` did with each staged file, printed as JSON.
 *
 * `refusedExchange` is set when the whole exchange was refused before any file
 * was read: the sender's inventory names another generation. Every refused
 * file stays in staging with its reason; `ignored` lists hidden names (an
 * interrupted rsync's temporary files), which are neither read nor removed.
 */
export interface ConversationSegmentReceiveReport {
  generationId: string
  expectedGenerationId?: string
  refusedExchange?: string
  received: string[]
  alreadyPresent: string[]
  refused: { name: string; reason: string }[]
  ignored: string[]
}
