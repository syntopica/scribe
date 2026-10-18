/** Where to receive into, the staging directory, and the sender's generation. */
export interface ReceiveConversationSegmentsOptions {
  root: string
  from: string
  /** The sender's inventory `generationId`; a mismatch refuses the exchange. */
  expectedGenerationId: string
}
