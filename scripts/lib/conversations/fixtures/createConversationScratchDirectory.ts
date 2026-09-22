import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A temporary directory that removes itself when the test ends. */
export const createConversationScratchDirectory = async (
  context: { after: (cleanup: () => Promise<void>) => void },
  prefix = 'conversation-segments-',
) => {
  const root = await fs.mkdtemp(join(tmpdir(), prefix))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  return root
}
