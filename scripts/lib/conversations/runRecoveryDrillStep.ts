import { ConversationWritersFrozenError } from './ConversationWritersFrozenError'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'

/**
 * Run one drill step, turning a throw into a failed step the report can print.
 * The freeze is not a failure of the step: it propagates and exits 75.
 */
export const runRecoveryDrillStep = async (
  step: string,
  run: () => Promise<ConversationRecoveryDrillStep>,
): Promise<ConversationRecoveryDrillStep> => {
  try {
    return await run()
  } catch (error) {
    if (error instanceof ConversationWritersFrozenError) throw error
    return {
      step,
      ok: false,
      problems: [error instanceof Error ? error.message : String(error)],
      details: {},
    }
  }
}
