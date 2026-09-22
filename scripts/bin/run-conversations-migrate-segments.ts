import { main } from '../commands/conversationsMigrateSegments'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'Conversation archive migration failed unexpectedly',
    error,
  )
})
