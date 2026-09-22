/**
 * Split a segment into its lines, refusing anything a reader could misframe.
 *
 * Splits on `\n` alone. Node's readline also terminates a line on U+2028 and
 * U+2029, and the previous archive carried 1,690 and 3 of them inside event
 * text: a reader using readline saw 32,434 lines where there were 30,741
 * records and mangled 1,634 of them. Serialization now escapes both, so a
 * segment cannot contain one -- this split is the second line of defence for
 * bytes that arrived from somewhere else.
 */
export const parseConversationSegmentLines = (text: string): string[] => {
  if (!text.endsWith('\n'))
    throw new Error('segment does not end with a newline')
  const lines = text.slice(0, -1).split('\n')
  if (lines.length < 2)
    throw new Error('segment is missing its header or footer')
  return lines
}
