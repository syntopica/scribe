/** Sorted, unique, without the empty entries v1 merges could leave behind. */
export const canonicalConversationRelativePaths = (
  paths: readonly string[],
): string[] =>
  [...new Set(paths.filter((path) => path.length > 0))].toSorted(
    (left, right) => left.localeCompare(right),
  )
