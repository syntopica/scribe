import { claudeCodeLine } from './claudeCodeLine'

/** A tool result the conversation gained after it was archived. */
export const CLAUDE_CODE_TOOL_OUTPUT_FOLLOW_UP = claudeCodeLine(
  [{ type: 'tool_result', tool_use_id: 'toolu_2', content: '2\tset -e' }],
  '2026-08-19T08:00:20Z',
)
