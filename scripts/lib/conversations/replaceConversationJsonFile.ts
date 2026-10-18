import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'

/** Replace a JSON file atomically: a reader sees the old bytes or the new. */
export const replaceConversationJsonFile = async (
  path: string,
  value: unknown,
) => {
  const temporary = `${path}.tmp-${randomUUID()}`
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
    flag: 'wx',
  })
  await fs.rename(temporary, path)
}
