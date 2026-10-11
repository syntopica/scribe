import { join } from 'node:path'
import { acknowledgeConversationSlice } from './acknowledgeConversationSlice'
import { captureArchiveContractHome } from './captureArchiveContractHome'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { createArchiveContractSegmentStore } from './createArchiveContractSegmentStore'
import { exportPendingConversationSlice } from './exportPendingConversationSlice'

/**
 * Write the pending slice Atrium ingests with `--partial`, from the contract home.
 *
 * The Codex conversation is captured and acknowledged first, then the Claude
 * Code one is captured, so the slice holds the Claude Code conversation alone:
 * a strict subset of `export.jsonl`, which is what lets Atrium's test show a
 * partial ingest writes what the slice names and touches nothing else.
 */
export const writeArchiveContractSliceFixture = async (output: string) => {
  const store = await createArchiveContractSegmentStore()
  try {
    const now = new Date(ARCHIVE_CONTRACT_FIXTURE_CLOCK)
    await captureArchiveContractHome(store, new Set(['codex']))
    const first = join(store.root, '..', 'first-slice.jsonl')
    await exportPendingConversationSlice({ ...store, output: first, now })
    await acknowledgeConversationSlice({ ...store, slice: first })
    await captureArchiveContractHome(store, new Set(['claude-code']))
    return await exportPendingConversationSlice({ ...store, output, now })
  } finally {
    await store.cleanup()
  }
}
