import type { ConversationExportManifest } from './types/ConversationExportManifest'
import type { ConversationExportStreamResult } from './types/ConversationExportStreamResult'

export const finalizeConversationExportStream = (
  manifest: ConversationExportManifest | undefined,
  records: number,
  contentSha256: string,
  errors: string[],
  lineCount: number,
): ConversationExportStreamResult => {
  if (lineCount === 0) errors.push('export is empty')
  if (manifest !== undefined && manifest.contentSha256 !== contentSha256) {
    errors.push('export content hash does not match the manifest')
  }
  if (manifest !== undefined && manifest.records !== records) {
    errors.push('export record count does not match the manifest')
  }
  return { records, errors, ...(manifest === undefined ? {} : { manifest }) }
}
