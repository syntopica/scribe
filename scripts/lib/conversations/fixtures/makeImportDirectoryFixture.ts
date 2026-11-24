import { mkdir, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IMPORT_DIRECTORY_PREFIX } from '../constants/IMPORT_DIRECTORY_PREFIX'
import { IMPORT_OWNER_FILE } from '../constants/IMPORT_OWNER_FILE'

/** An import directory under `root`, with an optional owner file and a modification time `ageMs` ago. */
export const makeImportDirectoryFixture = async (
  root: string,
  name: string,
  owner: string | undefined,
  ageMs: number,
) => {
  const path = join(root, IMPORT_DIRECTORY_PREFIX + name)
  await mkdir(path)
  await writeFile(join(path, 'capture.sqlite'), 'x')
  if (owner !== undefined) await writeFile(join(path, IMPORT_OWNER_FILE), owner)
  const when = new Date(Date.now() - ageMs)
  await utimes(path, when, when)
  return path
}
