import { promises as fs } from 'node:fs'

export const conversationPathExists = async (path: string) => {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
