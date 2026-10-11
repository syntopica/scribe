import { main } from '../commands/conversationsAckPending'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe ack-pending failed unexpectedly', error)
})
