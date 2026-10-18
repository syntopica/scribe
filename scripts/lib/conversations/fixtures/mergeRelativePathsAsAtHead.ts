/**
 * The v1 path merge as it stood before relativePath became an array
 * (`mergeConversationRecordFragments` at HEAD 2026-10-18), vendored verbatim
 * as the oracle the v1 bytes must keep matching.
 */
export const mergeRelativePathsAsAtHead = (left: string, right: string) =>
  [...new Set([left, right].flatMap((side) => side.split(',')))]
    .toSorted((a, b) => a.localeCompare(b))
    .join(',')
