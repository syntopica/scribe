import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationStagedSegmentOutcome } from './types/ConversationStagedSegmentOutcome'
import type { ReceiveStagedConversationSegmentOptions } from './types/ReceiveStagedConversationSegmentOptions'
import { verifyPresentConversationSegment } from './verifyPresentConversationSegment'

/**
 * Link one staged segment into the active generation, or leave it and say why.
 *
 * The staged file goes through the same barrier a reader applies: its bytes
 * must hash to its name, it must validate, and its header must name this
 * generation or be a base segment this generation's manifest names. Only then
 * is it published (fsync, link, directory fsync), and only after that is the
 * staged copy removed, so a stop at any point leaves either the staged file or
 * the linked one and a rerun finishes the job: a segment already linked is
 * reported `alreadyPresent` and its staged copy removed -- once the linked
 * bytes are re-hashed and synced; a corrupt destination is reported, never
 * overwritten, and the staged copy kept.
 */
export const receiveStagedConversationSegment = async (
  options: ReceiveStagedConversationSegmentOptions,
): Promise<ConversationStagedSegmentOutcome> => {
  const sha256 = /^s_([0-9a-f]{64})\.jsonl$/.exec(options.name)?.[1]
  if (sha256 === undefined) {
    return { outcome: 'refused', reason: 'not a segment name' }
  }
  let text: string
  try {
    ;({ text } = await readConversationArchiveSegment({
      segmentsDirectory: options.stagingDirectory,
      sha256,
      generation: options.generation,
    }))
  } catch (error) {
    return {
      outcome: 'refused',
      reason: error instanceof Error ? error.message : 'unreadable',
    }
  }
  const result = await publishConversationSegment({
    segmentsDirectory: options.segmentsDirectory,
    text,
  })
  if (
    !result.published &&
    !(await verifyPresentConversationSegment(result.path, sha256))
  ) {
    return {
      outcome: 'refused',
      reason: `destination corrupt: ${result.path} does not hash to its name; the staged copy is kept`,
    }
  }
  await fs.rm(join(options.stagingDirectory, options.name))
  return {
    outcome: result.published ? 'received' : 'alreadyPresent',
    sha256,
  }
}
