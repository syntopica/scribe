/** One step of the recovery drill as its report prints it. */
export interface ConversationRecoveryDrillStep {
  step: string
  ok: boolean
  problems: string[]
  details: Record<string, unknown>
}
