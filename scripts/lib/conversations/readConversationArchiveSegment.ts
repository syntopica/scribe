import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { CONVERSATION_BASE_GENERATION_ID } from './constants/CONVERSATION_BASE_GENERATION_ID'
import { hashText } from './hashText'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'
import { validateConversationSegment } from './validators/validateConversationSegment'

/**
 * Read one published segment and prove it belongs where it was found.
 *
 * Three separate claims are checked, because each one fails differently: the
 * bytes must hash to the name they were filed under, the segment must validate
 * against its own footer, and its header must name either this generation or
 * the base sentinel with the generation vouching for it. The last check is the
 * anti-resurrection barrier -- a peer that still holds the pre-erasure
 * generation copies segments whose header names the old id, and this is where
 * they stop.
 */
export const readConversationArchiveSegment = async (options: {
  segmentsDirectory: string
  sha256: string
  generation: ConversationArchiveGeneration
}) => {
  const path = join(options.segmentsDirectory, `s_${options.sha256}.jsonl`)
  const text = await fs.readFile(path, 'utf8')
  if (hashText(text) !== options.sha256) {
    throw new Error(`segment ${options.sha256} does not hash to its own name`)
  }

  const { header, entries } = validateConversationSegment(text)
  if (header.generationId === CONVERSATION_BASE_GENERATION_ID) {
    if (!options.generation.baseSegmentSha256.includes(options.sha256)) {
      throw new Error(
        `base segment ${options.sha256} is not named by this generation`,
      )
    }
  } else if (header.generationId !== options.generation.generationId) {
    throw new Error(
      `segment ${options.sha256} belongs to generation ${header.generationId}`,
    )
  }
  return { header, entries, text, path }
}
