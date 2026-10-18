/**
 * Split a v1 comma-joined path once, exactly, so joining it again gives back
 * the stored bytes; a v2 array is returned as it is.
 */
export const conversationRelativePathsFromStored = (
  relativePath: string | string[],
): string[] =>
  typeof relativePath === 'string' ? relativePath.split(',') : relativePath
