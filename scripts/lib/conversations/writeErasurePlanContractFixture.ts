import { promises as fs } from 'node:fs'
import { applyConversationArchiveErasure } from './applyConversationArchiveErasure'
import { captureArchiveContractHome } from './captureArchiveContractHome'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { createArchiveContractSegmentStore } from './createArchiveContractSegmentStore'
import { planConversationArchiveErasureFromRoot } from './planConversationArchiveErasureFromRoot'
import { readStoredConversationIdsBySource } from './readStoredConversationIdsBySource'
import { recordConversationErasureTarget } from './recordConversationErasureTarget'

/**
 * Write an applied erasure plan, from the contract home, as Atrium reads it.
 *
 * Both contract conversations are captured, the Claude Code one is planned
 * away, the plan is applied to the throwaway store, and the plan is written
 * with the generation it produced. `atrium erase --plan <file>` reads its
 * `conversationIds`; the generation fields say which erasure it was.
 */
export const writeErasurePlanContractFixture = async (output: string) => {
  const store = await createArchiveContractSegmentStore()
  try {
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
    const recorded = recordConversationErasureTarget(plan, applied.generationId)
    await fs.writeFile(output, `${JSON.stringify(recorded, null, 2)}\n`)
    return recorded
  } finally {
    await store.cleanup()
  }
}
