/** What sealing a generation needs: where, which base segments, and when. */
export interface SealConversationArchiveGenerationOptions {
  root: string
  baseSegments: AsyncIterable<string> | Iterable<string>
  createdAt: string
}
