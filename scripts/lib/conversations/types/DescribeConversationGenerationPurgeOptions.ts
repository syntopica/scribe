export interface DescribeConversationGenerationPurgeOptions {
  root: string
  generationId: string
  /** Allow purging the generation the selected one was rewritten from. */
  includeRollback: boolean
}
