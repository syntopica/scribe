import { promises as fs } from 'node:fs'

/**
 * The segment names a generation currently holds, in one stable order.
 *
 * Content addressing makes the inventory a set, so sorting it by name is
 * enough to give two hosts the same digest for the same archive. Anything not
 * matching the published shape -- a `.tmp-` file from a crashed writer, an
 * editor backup -- is not a segment and is not counted; a reader that guessed
 * otherwise would report damage every time a publication was interrupted.
 */
export const listConversationArchiveSegments = async (
  segmentsDirectory: string,
) => {
  const names = await fs.readdir(segmentsDirectory).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return [] as string[]
    throw error
  })
  return names
    .flatMap((name) => {
      const match = /^s_([0-9a-f]{64})\.jsonl$/.exec(name)
      return match?.[1] === undefined ? [] : [match[1]]
    })
    .toSorted((left, right) => left.localeCompare(right))
}
