import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { activateConversationArchiveGenerationLocked } from './activateConversationArchiveGenerationLocked'
import { inventoryConversationSegmentArchive } from './inventoryConversationSegmentArchive'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { receiveConversationSegments } from './receiveConversationSegments'
import { seedConversationArchiveGeneration } from './seedConversationArchiveGeneration'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'
import type { ConversationRecoveryDrillStepOptions } from './types/ConversationRecoveryDrillStepOptions'

/**
 * Step 4: a peer in `--work` on the baseline generation offers its segments
 * to the root, now on the erased generation; the whole exchange must be
 * refused with nothing received or consumed. The peer is then seeded with the
 * root's generation, activates it, and must report the root's inventory.
 */
export const runRecoveryDrillStalePeer = async (
  options: ConversationRecoveryDrillStepOptions,
): Promise<ConversationRecoveryDrillStep> => {
  const { root, work, migrationFrozen } = options
  const peer = join(work, 'peer')
  const outbox = join(work, 'peer-outbox')
  const stale = options.baseline.generationId
  const problems: string[] = []

  await seedConversationArchiveGeneration({
    root: peer,
    from: root,
    generationId: stale,
    migrationFrozen,
  })
  await activateConversationArchiveGenerationLocked(
    peer,
    stale,
    migrationFrozen,
  )
  await fs.cp(
    (await readConversationArchiveGeneration(peer)).segments,
    outbox,
    {
      recursive: true,
    },
  )
  const staged = (await fs.readdir(outbox)).length
  const exchange = await receiveConversationSegments({
    root,
    from: outbox,
    expectedGenerationId: stale,
    migrationFrozen,
  })
  if (exchange.refusedExchange === undefined)
    problems.push('a peer on the old generation was not refused')
  if (exchange.received.length > 0)
    problems.push(
      `${String(exchange.received.length)} segment(s) were received from the stale peer`,
    )
  if ((await fs.readdir(outbox)).length !== staged)
    problems.push('the refused exchange consumed staged files')

  const current = (await readConversationArchiveGeneration(root)).generation
    .generationId
  await seedConversationArchiveGeneration({
    root: peer,
    from: root,
    generationId: current,
    migrationFrozen,
  })
  await activateConversationArchiveGenerationLocked(
    peer,
    current,
    migrationFrozen,
  )
  const peerInventory = await inventoryConversationSegmentArchive({
    root: peer,
    statePath: join(work, 'peer-state.sqlite3'),
  })
  const rootInventory = await inventoryConversationSegmentArchive({
    root,
    statePath: join(work, 'state.sqlite3'),
  })
  const differing = (
    [
      'generationId',
      'baseSegments',
      'segmentSetSha256',
      'conversations',
    ] as const
  ).filter((key) => peerInventory[key] !== rootInventory[key])
  if (differing.length > 0)
    problems.push(
      `the reseeded peer differs from the root in ${differing.join(', ')}`,
    )
  return {
    step: 'stale-peer',
    ok: problems.length === 0,
    problems,
    details: {
      peer,
      staleGenerationId: stale,
      refusedExchange: exchange.refusedExchange,
      generationId: current,
      peerSegmentSet: peerInventory.segmentSetSha256,
      rootSegmentSet: rootInventory.segmentSetSha256,
      conversations: peerInventory.conversations,
    },
  }
}
