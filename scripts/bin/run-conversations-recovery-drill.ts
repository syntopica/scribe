import { main } from '../commands/conversationsRecoveryDrill'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe recovery-drill failed unexpectedly', error)
})
