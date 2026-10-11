import { randomUUID } from 'node:crypto'
import { createWriteStream, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { CONVERSATION_BASE_GENERATION_ID } from './constants/CONVERSATION_BASE_GENERATION_ID'
import { conversationFragmentBucketIndex } from './conversationFragmentBucketIndex'
import { forEachLfLine } from './forEachLfLine'
import { hashConversationFragment } from './hashConversationFragment'
import { sealConversationArchiveGeneration } from './sealConversationArchiveGeneration'
import { serializeConversationSegment } from './serializeConversationSegment'
import type { ConversationRecord } from './types/ConversationRecord'
import type { SealConversationRecordsAsGenerationOptions } from './types/SealConversationRecordsAsGenerationOptions'

/**
 * Seal a stream of fragments as the chunked base of a new, unselected generation.
 *
 * Fragments are spread over bucket files by hash and read back one bucket at a
 * time, so peak memory follows one segment rather than the corpus. Bucketing by
 * fragment hash also sends every copy of one fragment to the same bucket, where
 * the segment serializer folds them into one entry and unions their hosts.
 *
 * The generation is sealed, not selected: the caller decides when the archive
 * switches to it.
 */
export const sealConversationRecordsAsGeneration = async (
  options: SealConversationRecordsAsGenerationOptions,
) => {
  const scratch = join(options.root, `.seal-${randomUUID()}`)
  await fs.mkdir(scratch, { recursive: true, mode: 0o700 })

  try {
    const paths = Array.from({ length: options.buckets }, (_, index) =>
      join(scratch, `bucket-${String(index).padStart(3, '0')}.jsonl`),
    )
    const streams = paths.map((path) =>
      createWriteStream(path, { mode: 0o600 }),
    )
    for await (const record of options.records) {
      const index = conversationFragmentBucketIndex(
        hashConversationFragment(record),
        options.buckets,
      )
      const stream = streams[index]
      if (stream === undefined) throw new Error('bucket stream is missing')
      stream.write(`${JSON.stringify(record)}\n`)
    }
    for (const stream of streams) {
      await new Promise<void>((resolve, reject) => {
        stream.once('error', reject)
        stream.end(() => {
          resolve()
        })
      })
    }

    return await sealConversationArchiveGeneration({
      root: options.root,
      createdAt: options.createdAt,
      baseSegments: (async function* () {
        for (const path of paths) {
          const fragments: ConversationRecord[] = []
          await forEachLfLine(path, (line) => {
            if (line.length === 0) return
            fragments.push(JSON.parse(line) as ConversationRecord)
          })
          if (fragments.length === 0) continue
          yield serializeConversationSegment({
            fragments,
            generationId: CONVERSATION_BASE_GENERATION_ID,
            createdAt: options.createdAt,
          })
        }
      })(),
    })
  } finally {
    await fs.rm(scratch, { recursive: true, force: true })
  }
}
