/** One Claude Code transcript line, as the harness writes it. */
export const claudeCodeLine = (
  content: unknown,
  timestamp: string,
  role = 'user',
) =>
  JSON.stringify({
    type: role,
    sessionId: 'claude-tool-output',
    timestamp,
    message: { role, content },
  })
