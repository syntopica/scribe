import { findConversationSymlinkWithin } from './findConversationSymlinkWithin'
import { isResolvedConversationPathWithin } from './isResolvedConversationPathWithin'
import { recoveryDrillProtectedPaths } from './recoveryDrillProtectedPaths'
import { resolveConversationPathThroughAncestors } from './resolveConversationPathThroughAncestors'
import type { ConversationRecoveryDrillPaths } from './types/ConversationRecoveryDrillPaths'

/**
 * Refuse a recovery drill anywhere but a disposable copy, before it writes.
 *
 * The drill deletes state, seals and activates generations, and rolls back, so
 * pointed at a live archive it would rehearse an erasure on real data. Neither
 * `--root` nor `--work` may lie inside a protected location
 * (`recoveryDrillProtectedPaths`) or contain one, and neither may contain the
 * other: the state and the peer live in `--work` and must never land in the
 * archive. There is no override. Paths are compared after resolving symlinks,
 * so an alias of the live archive is refused like the archive itself, and the
 * root's tree may hold no symbolic link at all: any entry the drill or the
 * library reads or writes through (generations/, each g_<id> directory, segments/,
 * current-generation.json, the write lock) would otherwise lead out of the
 * copy. Hard links cannot redirect a write: the drill only creates new names
 * and renames the reference, never writes an existing file in place.
 */
export const assertConversationRecoveryDrillPaths = async (
  options: ConversationRecoveryDrillPaths,
): Promise<ConversationRecoveryDrillPaths> => {
  const root = await resolveConversationPathThroughAncestors(options.root)
  const work = await resolveConversationPathThroughAncestors(options.work)
  const protectedPaths = await Promise.all(
    recoveryDrillProtectedPaths().map(resolveConversationPathThroughAncestors),
  )
  for (const [flag, path] of [
    ['--root', root],
    ['--work', work],
  ] as const) {
    for (const live of protectedPaths) {
      if (
        isResolvedConversationPathWithin(path, live) ||
        isResolvedConversationPathWithin(live, path)
      )
        throw new Error(
          `${flag} ${path} overlaps live conversation data at ${live}; the drill runs only on a disposable copy`,
        )
    }
  }
  // An alias inside the copy (generations/, a g_<id> directory, segments/, the reference,
  // the lock) would carry the drill's writes out of it, into live data.
  const link = await findConversationSymlinkWithin(root).catch(
    (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    },
  )
  if (link !== undefined)
    throw new Error(
      `--root holds a symbolic link at ${link}; a disposable copy holds none, and the drill would write through it`,
    )
  if (
    isResolvedConversationPathWithin(work, root) ||
    isResolvedConversationPathWithin(root, work)
  )
    throw new Error(
      `--work ${work} and --root ${root} must be separate directories, neither inside the other`,
    )
  return { root, work }
}
