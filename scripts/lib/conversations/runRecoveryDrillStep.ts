import { ConversationWritersFrozenError } from './ConversationWritersFrozenError'
import { logRecoveryDrillStep } from './logRecoveryDrillStep'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'

/**
 * Run one drill step, turning a throw into a failed step the report can print.
 * The freeze is not a failure of the step: it propagates and exits 75.
 */
export const runRecoveryDrillStep = async (
  step: string,
  run: () => Promise<ConversationRecoveryDrillStep>,
): Promise<ConversationRecoveryDrillStep> => {
  logRecoveryDrillStep(step, 'start')
  try {
    const result = await run()
    logRecoveryDrillStep(step, result.ok ? 'ok' : 'failed')
    return result
  } catch (error) {
    if (error instanceof ConversationWritersFrozenError) throw error
    logRecoveryDrillStep(step, 'failed')
    return {
      step,
      ok: false,
      problems: [error instanceof Error ? error.message : String(error)],
      details: {},
    }
  }
}
