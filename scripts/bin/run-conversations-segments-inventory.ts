import { main } from '../commands/conversationsSegmentsInventory'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'scribe segments-inventory failed unexpectedly',
    error,
  )
})
