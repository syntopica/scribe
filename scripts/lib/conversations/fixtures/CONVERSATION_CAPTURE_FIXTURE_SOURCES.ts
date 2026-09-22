import type { ConversationSource } from '../types/ConversationSource'

/** The single source a capture fixture writes, so tests never scan a real home. */
export const CONVERSATION_CAPTURE_FIXTURE_SOURCES: ReadonlySet<ConversationSource> =
  new Set<ConversationSource>(['claude-code'])
