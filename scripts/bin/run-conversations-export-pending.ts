import { main } from '../commands/conversationsExportPending'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe export-pending failed unexpectedly', error)
})
