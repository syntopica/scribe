import { promises as fs } from 'node:fs'
import { assertConversationRecoveryDrillPaths } from '../lib/conversations/assertConversationRecoveryDrillPaths'
import { assertConversationWritersNotFrozen } from '../lib/conversations/assertConversationWritersNotFrozen'
import { conversationPathExists } from '../lib/conversations/conversationPathExists'
import { resolveConversationSegmentPaths } from '../lib/conversations/resolveConversationSegmentPaths'
import { runConversationRecoveryDrill } from '../lib/conversations/runConversationRecoveryDrill'
import type { ConversationRecoveryDrillPaths } from '../lib/conversations/types/ConversationRecoveryDrillPaths'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * `scribe recovery-drill --root <copy> --work <dir> [--exercise-erasure]
 * [--exercise-stale-peer] [--migration-frozen]`: rehearse recovery on a
 * disposable copy of a segment archive.
 *
 * Steps, each in the JSON report on stdout with its digests: baseline
 * (`verify-segments` digests), rebuild (delete the state in `--work`, rebuild
 * it from segments, digests equal), erasure (inject a synthetic marker
 * conversation, plan, apply, verify, activate; marker gone, every other
 * conversation unchanged), stale-peer (a peer in `--work` on the old
 * generation is refused as a whole exchange, then seeded and activated to the
 * root's inventory), rollback (the baseline generation activated again, every
 * digest equal). Exits 0 only when every step passed, 1 otherwise.
 *
 * Guard: `--root` and `--work` are required and have no default. The drill
 * refuses, with no override, a root or work directory inside or containing
 * `$SYNTOPICA_DATA` (when set), `$HOME/p/wiki` (always),
 * `$HOME/p/wiki/conversations` or `$HOME/.local/share/rocket-agents`; an unset
 * or empty `HOME`; one inside the other; a symbolic link anywhere under the
 * root; a root with no active generation; and a work directory that is not
 * empty.
 *
 * The drill writes only inside `--root` and `--work`. The root gains the
 * drill's generations, its write lock and reference, and transient `.seal-*`
 * scratch, which is why it must be a copy. The state, the verifier's
 * throwaway state, the peer, its outbox, the exports and the plan live in
 * `--work`.
 *
 * The drill is a writer, so the migration freeze sentinel stops it with exit
 * 75. The real drill is rehearsed inside the freeze window on a copy, so it
 * takes `--migration-frozen` as migrate, seed, receive and erase do.
 */
export const main = async () => {
  const argv = process.argv
  const requestedRoot = flagValue(argv, '--root')
  const requestedWork = flagValue(argv, '--work')
  if (requestedRoot === undefined || requestedWork === undefined) {
    console.error('--root and --work are required')
    process.exitCode = 2
    return
  }
  const exerciseErasure = argv.includes('--exercise-erasure')
  const exerciseStalePeer = argv.includes('--exercise-stale-peer')
  if (exerciseStalePeer && !exerciseErasure) {
    console.error(
      '--exercise-stale-peer needs --exercise-erasure: a peer is stale only once the root has moved to a new generation',
    )
    process.exitCode = 2
    return
  }
  const migrationFrozen = argv.includes('--migration-frozen')
  await assertConversationWritersNotFrozen(migrationFrozen)
  let paths: ConversationRecoveryDrillPaths
  try {
    paths = await assertConversationRecoveryDrillPaths({
      root: requestedRoot,
      work: requestedWork,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }
  if (
    !(await conversationPathExists(
      resolveConversationSegmentPaths(paths.root).reference,
    ))
  ) {
    console.error(`${paths.root} holds no active generation`)
    process.exitCode = 2
    return
  }
  await fs.mkdir(paths.work, { recursive: true, mode: 0o700 })
  if ((await fs.readdir(paths.work)).length > 0) {
    console.error(`--work ${paths.work} is not empty`)
    process.exitCode = 2
    return
  }
  const report = await runConversationRecoveryDrill({
    ...paths,
    exerciseErasure,
    exerciseStalePeer,
    migrationFrozen,
  })
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}
