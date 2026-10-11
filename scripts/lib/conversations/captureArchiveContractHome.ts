import { join } from 'node:path'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from './constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import { publishConversationCapture } from './publishConversationCapture'
import type { ArchiveContractSegmentStore } from './types/ArchiveContractSegmentStore'
import type { ConversationSource } from './types/ConversationSource'

/** Capture the committed contract home into a contract store, clock and host pinned. */
export const captureArchiveContractHome = async (
  store: ArchiveContractSegmentStore,
  sources: ReadonlySet<ConversationSource>,
) =>
  publishConversationCapture({
    home: join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'home'),
    root: store.root,
    statePath: store.statePath,
    sources,
    createdAt: ARCHIVE_CONTRACT_FIXTURE_CLOCK,
    host: 'contract-host',
  })
