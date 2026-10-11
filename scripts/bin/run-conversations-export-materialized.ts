import { main } from '../commands/conversationsExportMaterialized'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'scribe export-materialized failed unexpectedly',
    error,
  )
})
