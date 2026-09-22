import { main } from '../commands/conversationsExport'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('Conversation export failed unexpectedly', error)
})
