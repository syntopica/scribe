import type { ConversationSource } from '../types/ConversationSource'

export const CONVERSATION_SOURCES = [
  'claude-code',
  'codex',
  'continue',
  'cursor',
  'gemini',
  'hermes',
  'omp',
  'openclaw',
  'opencode',
  'pi',
  'trae',
  'treechat',
  'windsurf',
] as const satisfies readonly ConversationSource[]
