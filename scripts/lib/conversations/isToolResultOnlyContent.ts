/**
 * Whether a message body is nothing but tool output. Claude Code writes the
 * result of every tool call as a `type: "user"` line whose `message.content`
 * holds only `tool_result` blocks, so the role it declares is the harness's,
 * not the person's. A body mixing a result with typed text stays the user's.
 */
export const isToolResultOnlyContent = (content: unknown): boolean =>
  Array.isArray(content) &&
  content.length > 0 &&
  content.every(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      (block as Record<string, unknown>)['type'] === 'tool_result',
  )
