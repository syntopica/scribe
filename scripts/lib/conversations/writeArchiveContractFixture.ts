import { join } from 'node:path'
import { captureConversations } from './captureConversations'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from './constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import { writeConversationExport } from './writeConversationExport'

/**
 * Captures the contract fixture home and writes its export to `output`.
 *
 * The clock and the host label are pinned so the bytes depend only on the
 * fixture and on scribe's code.
 */
export const writeArchiveContractFixture = async (output: string) => {
  const report = await captureConversations(
    join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'home'),
    new Set(['claude-code', 'codex']),
  )
  if (!report.ok) throw new Error('contract fixture capture failed')
  const records = report.records.map((record) => ({
    ...record,
    hosts: ['contract-host'],
  }))
  return writeConversationExport(
    records,
    output,
    new Date('2026-08-19T10:00:00Z'),
  )
}
