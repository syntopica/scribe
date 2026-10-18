import { main } from '../commands/conversationsErase'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe erase failed unexpectedly', error)
})
