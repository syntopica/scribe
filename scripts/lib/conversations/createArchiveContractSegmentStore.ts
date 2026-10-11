import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { initializeConversationArchiveGeneration } from './initializeConversationArchiveGeneration'
import type { ArchiveContractSegmentStore } from './types/ArchiveContractSegmentStore'

/**
 * An empty segment store in a temporary directory, for writing contract
 * fixtures. Never a live archive: the directory is created here and removed by
 * the returned `cleanup`.
 */
export const createArchiveContractSegmentStore =
  async (): Promise<ArchiveContractSegmentStore> => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'scribe-contract-store-'))
    const root = join(directory, 'segments')
    await initializeConversationArchiveGeneration({
      root,
      baseSegments: [],
      createdAt: ARCHIVE_CONTRACT_FIXTURE_CLOCK,
    })
    return {
      root,
      statePath: join(directory, 'state.sqlite3'),
      cleanup: async () => fs.rm(directory, { recursive: true, force: true }),
    }
  }
