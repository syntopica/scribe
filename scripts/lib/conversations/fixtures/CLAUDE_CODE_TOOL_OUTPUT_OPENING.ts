import { claudeCodeLine } from './claudeCodeLine'

/** A question, a tool call, and the tool's result, archived before 2026-10-11. */
export const CLAUDE_CODE_TOOL_OUTPUT_OPENING = [
  claudeCodeLine('Why does the deploy fail?', '2026-08-19T08:00:00Z'),
  claudeCodeLine(
    [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} }],
    '2026-08-19T08:00:05Z',
    'assistant',
  ),
  claudeCodeLine(
    [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '1\texit 3' }],
    '2026-08-19T08:00:06Z',
  ),
]
