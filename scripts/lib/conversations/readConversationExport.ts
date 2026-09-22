import { promises as fs } from 'node:fs'
import { hashText } from './hashText'
import { parseConversationExportManifest } from './parseConversationExportManifest'
import { parseConversationRecordLines } from './parseConversationRecordLines'
import type { ConversationExportReadResult } from './types/ConversationExportReadResult'

export const readConversationExport = async (
  path: string,
): Promise<ConversationExportReadResult> => {
  const contents = await fs.readFile(path, 'utf8')
  const [manifestLine = '', ...recordLines] = contents.split('\n')
  const payload = recordLines.join('\n')
  const parsedManifest = parseConversationExportManifest(manifestLine)
  const parsedRecords = parseConversationRecordLines(recordLines)
  const errors = [...parsedRecords.errors]
  if ('error' in parsedManifest) errors.push(parsedManifest.error)
  const manifest =
    'manifest' in parsedManifest ? parsedManifest.manifest : undefined
  const { records } = parsedRecords

  if (manifest !== undefined && manifest.contentSha256 !== hashText(payload)) {
    errors.push('export content hash does not match the manifest')
  }
  if (manifest !== undefined && manifest.records !== records.length) {
    errors.push('export record count does not match the manifest')
  }

  return { records, errors, ...(manifest === undefined ? {} : { manifest }) }
}
