import { receiveConversationSegments } from '../receiveConversationSegments'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { stageMissingConversationSegments } from './stageMissingConversationSegments'

/** One transport pass from `from` to `to`: stage what is missing, receive it. */
export const exchangeConversationSegments = async (
  context: TestCleanupContext,
  from: string,
  to: string,
) => {
  const staged = await stageMissingConversationSegments(context, from, to)
  const report = await receiveConversationSegments({
    root: to,
    from: staged.staging,
    expectedGenerationId: staged.generationId,
  })
  return { ...staged, report }
}
