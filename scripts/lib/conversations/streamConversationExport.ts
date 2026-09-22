import { createHash } from 'node:crypto'
import { finalizeConversationExportStream } from './finalizeConversationExportStream'
import { forEachLfLine } from './forEachLfLine'
import { parseConversationExportManifest } from './parseConversationExportManifest'
import { parseStreamedConversationRecord } from './parseStreamedConversationRecord'
import type { ConversationExportStreamResult } from './types/ConversationExportStreamResult'
import type { ConversationRecord } from './types/ConversationRecord'

export const streamConversationExport = async (
  path: string,
  consume: (record: ConversationRecord) => void,
): Promise<ConversationExportStreamResult> => {
  const errors: string[] = []
  const hash = createHash('sha256')
  let manifest: ConversationExportStreamResult['manifest']
  let records = 0
  let lineNumber = 0
  await forEachLfLine(path, (line, terminated) => {
    lineNumber++
    if (lineNumber === 1) {
      const parsed = parseConversationExportManifest(line)
      if ('error' in parsed) errors.push(parsed.error)
      else manifest = parsed.manifest
      return
    }
    hash.update(`${line}${terminated ? '\n' : ''}`)
    const parsed = parseStreamedConversationRecord(line, lineNumber - 1)
    if (parsed.error !== undefined) errors.push(parsed.error)
    if (parsed.record === undefined) return
    consume(parsed.record)
    records++
  })

  return finalizeConversationExportStream(
    manifest,
    records,
    hash.digest('hex'),
    errors,
    lineNumber,
  )
}
