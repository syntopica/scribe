export interface ConversationProvenance {
  contentSha256: string
  /**
   * Every source path this conversation was read from, relative to the home.
   * An array since stage 3: the v1 format joined the entries with commas, so a
   * filename carrying one was split on the next merge.
   */
  relativePath: string[]
  redactions: number
}
