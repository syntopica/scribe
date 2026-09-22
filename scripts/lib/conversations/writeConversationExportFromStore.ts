import { once } from 'node:events'
import { createWriteStream, promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { finished } from 'node:stream/promises'
import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import type { ConversationCaptureStore } from './ConversationCaptureStore'
import { hashSerializedConversationRecords } from './hashSerializedConversationRecords'
import type { ConversationExportManifest } from './types/ConversationExportManifest'

export const writeConversationExportFromStore = async (
  store: ConversationCaptureStore,
  output: string,
  now = new Date(),
  skipped: readonly string[] = [],
  /**
   * Last chance to refuse the publication, called with the replacement fully
   * written and still under its temporary name.
   *
   * Serializing an archive of this size takes tens of minutes, so the caller's
   * pre-flight revision check is that far out of date by the time the rename
   * happens. Re-checking here costs one line of one file and turns a lost
   * update -- another writer's records silently absent afterwards -- into a
   * refusal the caller can retry. Throwing discards the temporary file and
   * leaves the archive exactly as it was found.
   */
  beforeRename?: () => Promise<void>,
) => {
  const manifest: ConversationExportManifest = {
    kind: 'rocket-agents-conversation-export',
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    records: store.count(),
    contentSha256: hashSerializedConversationRecords(store),
    ...(skipped.length > 0
      ? { complete: false as const, skipped: [...skipped] }
      : {}),
  }
  const temporary = `${output}.tmp-${String(process.pid)}`
  await fs.mkdir(dirname(output), { recursive: true, mode: 0o700 })
  const stream = createWriteStream(temporary, { mode: 0o600, flags: 'wx' })
  try {
    stream.write(`${JSON.stringify(manifest)}\n`)
    for (const record of store.serializedRecords()) {
      if (!stream.write(`${record}\n`)) await once(stream, 'drain')
    }
    stream.end()
    await finished(stream)
    await beforeRename?.()
    await fs.rename(temporary, output)
    return manifest
  } catch (error) {
    stream.destroy()
    await fs.rm(temporary, { force: true })
    throw error
  }
}
