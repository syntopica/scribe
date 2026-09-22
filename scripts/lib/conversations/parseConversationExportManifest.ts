import type { ConversationExportManifest } from './types/ConversationExportManifest'
import type { ConversationManifestParseResult } from './types/ConversationManifestParseResult'

export const parseConversationExportManifest = (
  line: string,
): ConversationManifestParseResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(line) as unknown
  } catch {
    return { error: 'manifest is not valid JSON' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'invalid export manifest' }
  }

  const manifest = parsed as Record<string, unknown>
  if (
    manifest['kind'] !== 'rocket-agents-conversation-export' ||
    (manifest['schemaVersion'] !== 1 && manifest['schemaVersion'] !== 2) ||
    typeof manifest['createdAt'] !== 'string' ||
    typeof manifest['records'] !== 'number' ||
    typeof manifest['contentSha256'] !== 'string'
  ) {
    return { error: 'invalid export manifest' }
  }
  return { manifest: manifest as unknown as ConversationExportManifest }
}
