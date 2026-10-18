import { promises as fs } from 'node:fs'

/** Create a file that must not exist yet and get its bytes to the device. */
export const writeConversationFileDurably = async (
  path: string,
  text: string,
) => {
  const handle = await fs.open(path, 'wx', 0o600)
  try {
    await handle.writeFile(text)
    await handle.sync()
  } finally {
    await handle.close()
  }
}
