import type { ConversationArchiveDigests } from './ConversationArchiveDigests'
import type { ConversationRecoveryDrillOptions } from './ConversationRecoveryDrillOptions'

/** What every step after the baseline needs: the drill and its baseline. */
export interface ConversationRecoveryDrillStepOptions extends ConversationRecoveryDrillOptions {
  baseline: ConversationArchiveDigests
}
