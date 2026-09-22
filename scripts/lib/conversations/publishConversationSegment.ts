import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { hashText } from './hashText'
import { validateConversationSegment } from './validators/validateConversationSegment'

/**
 * Put one segment on disk under the name its own bytes earn.
 *
 * The sequence is write, fsync, link, unlink, fsync the directory. The link is
 * what makes it atomic: `link(2)` fails rather than replacing, so the final
 * name can only ever appear once and only after the footer is durable. A crash
 * leaves either nothing, a `.tmp-` file nobody reads, or a complete segment --
 * never a half-named one a reader has to judge.
 *
 * Publishing the same bytes twice is not an error and not a write. Two hosts
 * that captured the same conversation produce the same hash, so the second one
 * finds its work already done, which is the whole reason sync is a copy of
 * missing names rather than a merge.
 */
export const publishConversationSegment = async (options: {
  segmentsDirectory: string
  text: string
}) => {
  const sha256 = hashText(options.text)
  const final = join(options.segmentsDirectory, `s_${sha256}.jsonl`)
  // Refuse to name a file after bytes that are not a readable segment: an
  // unreadable object would then be indistinguishable from storage damage.
  validateConversationSegment(options.text)

  await fs.mkdir(options.segmentsDirectory, { recursive: true, mode: 0o700 })
  const existing = await fs.stat(final).catch(() => undefined)
  if (existing !== undefined) return { sha256, path: final, published: false }

  const temporary = join(
    options.segmentsDirectory,
    `.tmp-${String(process.pid)}-${randomUUID()}`,
  )
  const handle = await fs.open(temporary, 'wx', 0o600)
  try {
    await handle.writeFile(options.text)
    await handle.sync()
  } finally {
    await handle.close()
  }

  let published = true
  try {
    await fs.link(temporary, final)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    published = false
  }
  await fs.rm(temporary, { force: true })
  await fsyncConversationDirectory(options.segmentsDirectory)
  return { sha256, path: final, published }
}
