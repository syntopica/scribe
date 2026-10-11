import { join } from 'node:path'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from '../lib/conversations/constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import { writeArchiveContractFixture } from '../lib/conversations/writeArchiveContractFixture'
import { writeArchiveContractSliceFixture } from '../lib/conversations/writeArchiveContractSliceFixture'
import { writeErasedMaterializedContractFixture } from '../lib/conversations/writeErasedMaterializedContractFixture'
import { writeErasurePlanContractFixture } from '../lib/conversations/writeErasurePlanContractFixture'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

writeArchiveContractFixture(join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'export.jsonl'))
  .then(async () =>
    writeArchiveContractSliceFixture(
      join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'pending-slice.jsonl'),
    ),
  )
  .then(async () =>
    writeErasurePlanContractFixture(
      join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'erasure-plan.json'),
    ),
  )
  .then(async () =>
    writeErasedMaterializedContractFixture(
      join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'materialized-after-erasure.jsonl'),
    ),
  )
  .catch((error: unknown) => {
    reportUnexpectedFailure('Contract fixture write failed unexpectedly', error)
  })
