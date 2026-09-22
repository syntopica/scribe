import { join } from 'node:path'
import { captureConversationArtifactsIncrementally } from './captureConversationArtifactsIncrementally'
import { CONVERSATION_SEGMENT_FRAGMENT_LIMIT } from './constants/CONVERSATION_SEGMENT_FRAGMENT_LIMIT'
import { conversationCaptureVersionStamp } from './conversationCaptureVersionStamp'
import { conversationHostLabel } from './conversationHostLabel'
import { hashConversationFragment } from './hashConversationFragment'
import { openConversationArchiveState } from './openConversationArchiveState'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { serializeConversationSegment } from './serializeConversationSegment'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationSource } from './types/ConversationSource'
import { upgradeConversationRecord } from './upgradeConversationRecord'
import { validateConversationSegment } from './validators/validateConversationSegment'
import { withArchiveWriteLock } from './withArchiveWriteLock'

/**
 * One capture, ending in as many segments as it had new fragments to carry.
 *
 * The unit of publication is the set of fragments this pass saw and the
 * archive did not already hold. A capture that finds nothing new writes
 * nothing at all: no segment, no rewritten corpus, no backup of four
 * gigabytes. That is the point of the change. The v1 path spent 132.36 seconds
 * and roughly 12 GB of I/O to add a single conversation, because adding
 * anything meant reading, backing up and rewriting everything.
 *
 * Fragments are flushed in bounded groups rather than accumulated, so peak
 * memory follows the group size and not the size of the archive being seeded.
 * Publishing several segments from one pass is free: a segment is a set of
 * fragments, and the reducer does not care which one a fragment arrived in.
 *
 * A fragment the archive already holds is staged again only when this host
 * is not yet recorded as having observed it. The entry that results carries
 * the same record under the same hash, so it costs the reducer nothing; what
 * it adds is the host, which is the one fact about a known conversation the
 * other machine cannot supply.
 *
 * Cache rows are committed last, and only for artifacts whose fingerprint was
 * stable across the read and whose fragments are now published. A crash
 * anywhere before that leaves the archive correct and the cache pessimistic,
 * which costs one recapture; the reverse ordering would leave the cache
 * claiming work that no segment contains.
 */
export const publishConversationCapture = async (options: {
  home: string
  root: string
  statePath: string
  sources?: ReadonlySet<ConversationSource>
  createdAt: string
  fragmentLimit?: number
  host?: string
}) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const { state, replayed, rebuilt } = await openConversationArchiveState({
    statePath: options.statePath,
    generation,
    segmentsDirectory: segments,
  })

  try {
    const host = options.host ?? conversationHostLabel()
    const limit = options.fragmentLimit ?? CONVERSATION_SEGMENT_FRAGMENT_LIMIT
    const staged = new Map<string, ConversationRecord>()
    const published: {
      sha256: string
      published: boolean
      bytes: number
      fragments: number
    }[] = []
    const touched = new Set<string>()
    const rows: {
      key: { source: string; relativePath: string; storageKind: string }
      fingerprint: NonNullable<
        Parameters<typeof state.putArtifact>[0]['fingerprint']
      >
      fragmentHashes: string[]
    }[] = []
    let fragmentsAppended = 0

    const flush = async () => {
      const fragments = [...staged.values()]
      staged.clear()
      if (fragments.length === 0) return
      fragmentsAppended += fragments.length
      const result = await withArchiveWriteLock(
        join(options.root, 'archive'),
        async () => {
          const text = serializeConversationSegment({
            fragments,
            generationId: generation.generationId,
            createdAt: options.createdAt,
          })
          return {
            ...(await publishConversationSegment({
              segmentsDirectory: segments,
              text,
            })),
            text,
          }
        },
      )
      published.push({
        sha256: result.sha256,
        published: result.published,
        bytes: Buffer.byteLength(result.text),
        fragments: fragments.length,
      })
      for (const id of state.addSegment({
        sha256: result.sha256,
        entries: validateConversationSegment(result.text).entries,
        createdAt: options.createdAt,
      })) {
        touched.add(id)
      }
    }

    const metrics = await captureConversationArtifactsIncrementally({
      home: options.home,
      sources: options.sources,
      state,
      generationId: generation.generationId,
      host,
      onArtifact: async ({ key, fingerprint, records }) => {
        const hashes: string[] = []
        for (const record of records.map(upgradeConversationRecord)) {
          const hash = hashConversationFragment(record)
          hashes.push(hash)
          if (state.hasFragment(hash)) {
            const known = state.fragmentHosts(hash)
            const observed = record.hosts ?? []
            if (observed.every((host) => known.includes(host))) continue
          }
          staged.set(hash, record)
        }
        if (fingerprint !== undefined) {
          rows.push({ key, fingerprint, fragmentHashes: hashes })
        }
        if (staged.size >= limit) await flush()
      },
    })
    await flush()

    for (const id of touched) state.materialize(id)
    state.markPending([...touched])

    for (const row of rows) {
      state.putArtifact({
        ...row.key,
        fingerprint: row.fingerprint,
        fragmentHashes: row.fragmentHashes,
        generationId: generation.generationId,
        captureVersions: conversationCaptureVersionStamp(host),
      })
    }

    return {
      generationId: generation.generationId,
      metrics: { ...metrics, fragmentsAppended },
      replayedSegments: replayed,
      rebuiltState: rebuilt,
      segments: published,
      conversationsChanged: touched.size,
      counts: state.counts(),
    }
  } finally {
    state.close()
  }
}
