/** Yield `ids` in consecutive arrays of at most `size`, in the order given. */
export function* chunkConversationIds(ids: Iterable<string>, size: number) {
  let chunk: string[] = []
  for (const id of ids) {
    chunk.push(id)
    if (chunk.length < size) continue
    yield chunk
    chunk = []
  }
  if (chunk.length > 0) yield chunk
}
