import { promises as fs } from 'node:fs'
import { applyArchiveContractErasure } from './applyArchiveContractErasure'
import { createArchiveContractSegmentStore } from './createArchiveContractSegmentStore'

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
    const recorded = await applyArchiveContractErasure(store)
    await fs.writeFile(output, `${JSON.stringify(recorded, null, 2)}\n`)
    return recorded
  } finally {
    await store.cleanup()
  }
}
