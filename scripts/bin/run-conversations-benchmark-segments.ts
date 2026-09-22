import { main } from '../commands/conversationsBenchmarkSegments'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'Conversation segment benchmark failed unexpectedly',
    error,
  )
})
