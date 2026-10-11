import { fileURLToPath } from 'node:url'

/**
 * The versioned archive-contract fixture: a provider-shaped home and the
 * export scribe writes from it. Atrium vendors the export and ingests it in its
 * tests, so a change here is a change to the wire format Atrium reads.
 */
export const ARCHIVE_CONTRACT_FIXTURE_ROOT = fileURLToPath(
  new URL('../../../../fixtures/archive-contract/v2/', import.meta.url),
)
