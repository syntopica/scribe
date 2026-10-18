import { main } from '../commands/conversationsSegmentsReceive'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe segments-receive failed unexpectedly', error)
})
