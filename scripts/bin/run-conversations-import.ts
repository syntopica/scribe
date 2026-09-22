import { main } from '../commands/conversationsImport'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('Conversation import failed unexpectedly', error)
})
