import { join } from 'node:path'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from '../lib/conversations/constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import { writeArchiveContractFixture } from '../lib/conversations/writeArchiveContractFixture'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

writeArchiveContractFixture(
  join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'export.jsonl'),
).catch((error: unknown) => {
  reportUnexpectedFailure('Contract fixture write failed unexpectedly', error)
})
