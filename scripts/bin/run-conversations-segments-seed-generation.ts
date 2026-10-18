import { main } from '../commands/conversationsSegmentsSeedGeneration'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'scribe segments-seed-generation failed unexpectedly',
    error,
  )
})
