/** Where to receive into, the staging directory, and the sender's generation. */
export interface ReceiveConversationSegmentsOptions {
  root: string
  from: string
  /** The sender's inventory `generationId`; a mismatch refuses the exchange. */
  expectedGenerationId: string
  /** `--migration-frozen`: a cutover step that runs inside the writer freeze. */
  migrationFrozen?: boolean
}
