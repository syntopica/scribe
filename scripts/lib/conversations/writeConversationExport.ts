import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { hashText } from './hashText'
import { serializeConversationRecords } from './serializeConversationRecords'
import type { ConversationExportManifest } from './types/ConversationExportManifest'
import type { ConversationRecord } from './types/ConversationRecord'
import { upgradeConversationRecord } from './upgradeConversationRecord'

export const writeConversationExport = async (
  records: ConversationRecord[],
  output: string,
  now = new Date(),
) => {
  // Same rule as the store's read boundary: the manifest states the current
  // schema version, so the records under it have to be at that version.
  const payload = serializeConversationRecords(
    records.map(upgradeConversationRecord),
  )
  const manifest: ConversationExportManifest = {
    kind: 'rocket-agents-conversation-export',
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    records: records.length,
    contentSha256: hashText(payload),
  }
  const temporary = `${output}.tmp-${String(process.pid)}`
  await fs.mkdir(dirname(output), { recursive: true, mode: 0o700 })
  await fs.writeFile(temporary, `${JSON.stringify(manifest)}\n${payload}`, {
    mode: 0o600,
  })
  await fs.rename(temporary, output)
  return manifest
}
