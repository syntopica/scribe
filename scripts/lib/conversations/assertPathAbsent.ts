import { promises as fs } from 'node:fs'

/**
 * Throw EEXIST when anything at all is at `path`, a dangling symlink or a
 * directory included: `cp -n` treats a directory as the place to copy into and
 * writes through a dangling symlink, where COPYFILE_EXCL refused both.
 */
export const assertPathAbsent = async (path: string) => {
  try {
    await fs.lstat(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  throw Object.assign(new Error(`EEXIST: file already exists, ${path}`), {
    code: 'EEXIST',
  })
}
