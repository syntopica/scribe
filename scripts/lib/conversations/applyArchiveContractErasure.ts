import { applyConversationArchiveErasure } from './applyConversationArchiveErasure'
import { captureArchiveContractHome } from './captureArchiveContractHome'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { planConversationArchiveErasureFromRoot } from './planConversationArchiveErasureFromRoot'
import { readStoredConversationIdsBySource } from './readStoredConversationIdsBySource'
import { recordConversationErasureTarget } from './recordConversationErasureTarget'
import type { ArchiveContractSegmentStore } from './types/ArchiveContractSegmentStore'

/**
 * Capture the contract home into a contract store and erase its Claude Code
 * conversation, returning the plan as recorded after apply. The new generation
 * is sealed but not selected; the caller decides whether to switch to it.
 */
export const applyArchiveContractErasure = async (
  store: ArchiveContractSegmentStore,
) => {
  await captureArchiveContractHome(store, new Set(['claude-code', 'codex']))
  const plan = await planConversationArchiveErasureFromRoot({
    root: store.root,
    createdAt: ARCHIVE_CONTRACT_FIXTURE_CLOCK,
    reason: 'erasure',
    removeConversationIds: await readStoredConversationIdsBySource(
      store,
      'claude-code',
    ),
  })
  const applied = await applyConversationArchiveErasure({
    root: store.root,
    plan,
    createdAt: ARCHIVE_CONTRACT_FIXTURE_CLOCK,
  })
  return recordConversationErasureTarget(plan, applied.generationId)
}
