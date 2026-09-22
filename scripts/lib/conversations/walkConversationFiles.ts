import { inspectConversationPath } from './inspectConversationPath'

export const walkConversationFiles = async (root: string, maximum = 50_000) => {
  const files: string[] = []
  const pending = [root]

  while (pending.length > 0 && files.length < maximum) {
    const current = pending.pop()
    if (current === undefined) break

    const inspected = await inspectConversationPath(current)
    if (inspected.kind === 'file') files.push(inspected.path)
    if (inspected.kind === 'directory')
      pending.push(...inspected.paths.toReversed())
  }

  return files.toSorted((left, right) => left.localeCompare(right))
}
