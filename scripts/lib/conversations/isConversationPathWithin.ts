import { promises as fs } from 'node:fs'
import { isAbsolute, relative } from 'node:path'

/**
 * True when `inner` is `outer` or lies inside it, after resolving symlinks on
 * both, so an alias of a directory cannot pass for a different one.
 */
export const isConversationPathWithin = async (
  inner: string,
  outer: string,
) => {
  const path = relative(await fs.realpath(outer), await fs.realpath(inner))
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}
