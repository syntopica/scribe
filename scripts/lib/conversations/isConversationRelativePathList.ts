import { isSafeConversationRelativePath } from './isSafeConversationRelativePath'

/** The v2 form of `provenance.relativePath`: at least one path, each safe. */
export const isConversationRelativePathList = (
  value: unknown,
): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (entry) =>
      typeof entry === 'string' && isSafeConversationRelativePath(entry),
  )
