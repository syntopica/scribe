import type { ConversationRecoveryDrillStep } from './ConversationRecoveryDrillStep'

/** The JSON `scribe recovery-drill` prints: ok only when every step ran and passed. */
export interface ConversationRecoveryDrillReport {
  ok: boolean
  root: string
  work: string
  steps: ConversationRecoveryDrillStep[]
}
