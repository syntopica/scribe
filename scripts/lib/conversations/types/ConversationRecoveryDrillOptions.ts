import type { ConversationRecoveryDrillPaths } from './ConversationRecoveryDrillPaths'

/** A disposable archive copy, the directory the drill owns, and what to exercise. */
export interface ConversationRecoveryDrillOptions extends ConversationRecoveryDrillPaths {
  exerciseErasure: boolean
  exerciseStalePeer: boolean
  /** `--migration-frozen`: the drill is rehearsed inside the writer freeze. */
  migrationFrozen: boolean
}
