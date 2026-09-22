import { randomUUID } from 'node:crypto'
import { createWriteStream, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { CONVERSATION_BASE_GENERATION_ID } from './constants/CONVERSATION_BASE_GENERATION_ID'
import { conversationFragmentBucketIndex } from './conversationFragmentBucketIndex'
import { forEachLfLine } from './forEachLfLine'
import { hashConversationFragment } from './hashConversationFragment'
import { initializeConversationArchiveGeneration } from './initializeConversationArchiveGeneration'
import { serializeConversationSegment } from './serializeConversationSegment'
import { streamConversationExport } from './streamConversationExport'
import type { ConversationRecord } from './types/ConversationRecord'
import { upgradeConversationRecord } from './upgradeConversationRecord'

/**
 * Turn one v1 archive file into the base segments of a new generation.
 *
 * The base is chunked and never a single object. The live archive is 4.00 GB
 * and holds 4,617 conversations that exist on no other machine; one base file
 * would mean every verification re-reads all of it, every transfer restarts
 * from zero on a dropped connection, and the first erasure has to rewrite a
 * four-gigabyte object to remove one line.
 *
 * Records are upgraded on the way through. A version 1 event id is
 * unqualified, and a base segment that mixed both schemas would hand the
 * reducer the same event twice under two identities.
 *
 * Bucket files are written next to the destination and read back one at a
 * time, which is what keeps peak memory near one segment rather than one
 * corpus. Splitting on `\n` alone, here and in the reader, is not a detail:
 * the archive carries 1,690 U+2028 and 3 U+2029 inside event text, and any
 * reader that treats those as line breaks sees 32,434 lines where there are
 * 30,741 records.
 */
export const migrateConversationArchiveToSegments = async (options: {
  archive: string
  root: string
  createdAt: string
  buckets?: number
}) => {
  const buckets = options.buckets ?? 32
  const scratch = join(options.root, `.migration-${randomUUID()}`)
  await fs.mkdir(scratch, { recursive: true, mode: 0o700 })

  try {
    const paths = Array.from({ length: buckets }, (_, index) =>
      join(scratch, `bucket-${String(index).padStart(3, '0')}.jsonl`),
    )
    const streams = paths.map((path) =>
      createWriteStream(path, { mode: 0o600 }),
    )
    const seen = new Set<string>()
    let duplicates = 0

    const streamed = await streamConversationExport(
      options.archive,
      (record: ConversationRecord) => {
        const upgraded = upgradeConversationRecord(record)
        const hash = hashConversationFragment(upgraded)
        if (seen.has(hash)) duplicates++
        seen.add(hash)
        const stream = streams[conversationFragmentBucketIndex(hash, buckets)]
        if (stream === undefined) throw new Error('bucket stream is missing')
        // The whole record, not its canonical bytes: the canonical form drops
        // `hosts`, and the segment serializer canonicalizes on its own. A
        // duplicate is counted and still written, because it may name a host
        // the first copy did not; the serializer folds the two into one entry.
        stream.write(`${JSON.stringify(upgraded)}\n`)
      },
    )
    for (const stream of streams) {
      await new Promise<void>((resolve, reject) => {
        stream.once('error', reject)
        stream.end(() => {
          resolve()
        })
      })
    }

    const sealed = await initializeConversationArchiveGeneration({
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

    return {
      generationId: sealed.generationId,
      segments: sealed.segments,
      fragments: seen.size,
      duplicates,
      streamed,
    }
  } finally {
    await fs.rm(scratch, { recursive: true, force: true })
  }
}
