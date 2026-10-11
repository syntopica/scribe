import { conversationRecordFromDocument } from '../conversationRecordFromDocument'
import type { ConversationRecord } from '../types/ConversationRecord'

/** The record a capture makes of these Claude Code lines today. */
export const captureClaudeCodeLines = (lines: string[]): ConversationRecord => {
  const record = conversationRecordFromDocument({
    contents: `${lines.join('\n')}\n`,
    relativePath: '.claude/projects/p/session.jsonl',
    source: 'claude-code',
    sourceIdHint: 'session',
  })
  if (record === undefined) throw new Error('the lines hold no conversation')
  return record
}
