import { promises as fs } from 'node:fs'

/**
 * Make a newly linked segment name survive a power loss, not just a crash.
 *
 * `FileHandle.sync()` on the segment gets its bytes to the device; the name
 * that points at them lives in the directory, and until the directory is
 * synced a host can come back holding complete segment bytes that nothing
 * references. Publication reports success only after this returns.
 */
export const fsyncConversationDirectory = async (directory: string) => {
  const handle = await fs.open(directory, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}
