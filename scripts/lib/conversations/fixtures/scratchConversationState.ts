import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'

/**
 * Point `ROCKET_AGENTS_CONVERSATION_STATE`, and so the freeze sentinel, at a
 * scratch directory for this test, restoring the previous value afterwards.
 */
export const scratchConversationState = async (context: TestCleanupContext) => {
  const state = await createConversationScratchDirectory(context, 'state-')
  const previous = process.env['ROCKET_AGENTS_CONVERSATION_STATE']
  process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = state
  context.after(() => {
    if (previous === undefined)
      delete process.env['ROCKET_AGENTS_CONVERSATION_STATE']
    else process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = previous
    return Promise.resolve()
  })
  return state
}
