import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createWriteStream, promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { finished } from 'node:stream/promises'
import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import type { ConversationExportManifest } from './types/ConversationExportManifest'
import type { WriteConversationExportFromRecordsOptions } from './types/WriteConversationExportFromRecordsOptions'
import { upgradeConversationRecord } from './upgradeConversationRecord'

/**
 * Write an ordinary export file from a stream of records, in bounded memory.
 *
 * The output is what Atrium already reads: the manifest line, then one record
 * per line, in the order the source yields them. The first pass hashes and
 * counts, the second writes under a temporary name that is renamed into place
 * only once complete, so a reader never sees half an export. A source that
 * yields different bytes on the second pass would produce a file whose
 * manifest does not match, so the second pass re-hashes and refuses one.
 */
export const writeConversationExportFromRecords = async (
  options: WriteConversationExportFromRecordsOptions,
) => {
  const line = (record: Parameters<typeof upgradeConversationRecord>[0]) =>
    `${JSON.stringify(upgradeConversationRecord(record))}\n`
  const hash = createHash('sha256')
  let records = 0
  for (const record of options.records()) {
    hash.update(line(record))
    records++
  }
  const manifest: ConversationExportManifest = {
    kind: 'rocket-agents-conversation-export',
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    createdAt: options.now.toISOString(),
    records,
    contentSha256: hash.digest('hex'),
  }

  const temporary = `${options.output}.tmp-${String(process.pid)}`
  await fs.mkdir(dirname(options.output), { recursive: true, mode: 0o700 })
  const stream = createWriteStream(temporary, { mode: 0o600, flags: 'wx' })
  try {
    stream.write(`${JSON.stringify(manifest)}\n`)
    const check = createHash('sha256')
    for (const record of options.records()) {
      const text = line(record)
      check.update(text)
      if (!stream.write(text)) await once(stream, 'drain')
    }
    stream.end()
    await finished(stream)
    if (check.digest('hex') !== manifest.contentSha256) {
      throw new Error('the records changed while the export was being written')
    }
    await fs.rename(temporary, options.output)
    return manifest
  } catch (error) {
    stream.destroy()
    await fs.rm(temporary, { force: true })
    throw error
  }
}
