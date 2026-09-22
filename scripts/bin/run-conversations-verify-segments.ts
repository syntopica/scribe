import { main } from '../commands/conversationsVerifySegments'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'Conversation archive verification failed unexpectedly',
    error,
  )
})
