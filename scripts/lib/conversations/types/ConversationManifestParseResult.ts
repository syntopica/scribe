import type { ConversationExportManifest } from './ConversationExportManifest'

export type ConversationManifestParseResult =
  { manifest: ConversationExportManifest } | { error: string }
