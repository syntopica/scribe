import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupConversationArchive } from './backupConversationArchive'
import { ConversationArchiveChangedError } from './ConversationArchiveChangedError'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { pruneConversationArchiveBackups } from './pruneConversationArchiveBackups'
import { readArchiveRevision } from './readArchiveRevision'
import { rewriteConversationRecord } from './rewriteConversationRecord'
import { streamConversationExport } from './streamConversationExport'
import type { ConversationRewriteChanges } from './types/ConversationRewriteChanges'
import type { ConversationRewriteResult } from './types/ConversationRewriteResult'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeConversationExportFromStore } from './writeConversationExportFromStore'

/**
 * Rewrite a v1 archive in place: normalized provenance paths, the named home
 * prefixes redacted, everything else byte for byte.
 *
 * A dry run is one streaming pass that counts and writes nothing - not even
 * a scratch database. An apply is a second pass into a fresh store, one
 * record per id (a repeated id is refused, because `replace` would keep the
 * first and the count would lie), then the same publication the import path
 * uses: the write lock, the revision checked before the write and again
 * before the rename, a backup beside the archive, older backups pruned only
 * after the rename. Before the rename the replacement is read back whole and
 * proved to be a complete export whose records the transform would leave
 * alone - the idempotence check is what says the rewrite is finished rather
 * than half-done.
 *
 * Refused outright when any record is still at schema 1: the writer upgrades
 * those on the way out, and an id-changing rewrite is a different operation
 * from this one. Refused too when a prefix is not an absolute path: a flag
 * token or a relative name would redact the wrong bytes and leave the home
 * exposed, and `--home --apply` is exactly how one arrives here (Codex
 * reproduced it). The manifest's completeness is carried over: a partial
 * export stays partial, skips and all, because nothing here recovered them.
 */
export const rewriteConversationArchive = async (options: {
  archive: string
  homes: readonly string[]
  apply: boolean
  now?: Date
}): Promise<ConversationRewriteResult> => {
  const homes = [...new Set(options.homes)].toSorted((left, right) =>
    left.localeCompare(right),
  )
  const count = (): ConversationRewriteChanges => ({
    records: 0,
    changed: 0,
    pathsNormalized: 0,
    pathBytesSaved: 0,
    titlesRedacted: 0,
    workspacesRedacted: 0,
    eventsRedacted: 0,
    legacyRecords: 0,
  })
  const finish = (
    changes: ConversationRewriteChanges,
    errors: string[],
    extra: Partial<ConversationRewriteResult> = {},
  ): ConversationRewriteResult => ({
    ok: errors.length === 0,
    applied: false,
    archive: options.archive,
    homes,
    changes,
    errors,
    ...extra,
  })

  const malformed = homes.filter(
    (home) => !home.startsWith('/') || home.length < 2 || home.endsWith('/'),
  )
  if (malformed.length > 0)
    return finish(count(), [
      `home prefixes must be absolute paths without a trailing slash: ${malformed.join(', ')}`,
    ])

  const mergedFrom = await readArchiveRevision(options.archive)
  const planned = count()
  const preview = await streamConversationExport(options.archive, (record) => {
    rewriteConversationRecord(record, homes, planned)
  })
  if (preview.errors.length > 0)
    return finish(
      planned,
      preview.errors.map((error) => `archive: ${error}`),
    )
  if (!options.apply || planned.changed === 0) return finish(planned, [])
  if (planned.legacyRecords > 0)
    return finish(planned, [
      `${String(planned.legacyRecords)} records are still at schema 1 and would have their event ids upgraded by the writer; this rewrite keeps ids and refuses`,
    ])

  const directory = await mkdtemp(
    join(tmpdir(), 'rocket-agents-conversation-rewrite-'),
  )
  const store = new ConversationCaptureStore(join(directory, 'rewrite.sqlite'))
  try {
    const applied = count()
    const repeated: string[] = []
    const loaded = await streamConversationExport(options.archive, (record) => {
      const { record: rewritten } = rewriteConversationRecord(
        record,
        homes,
        applied,
      )
      if (store.replace(rewritten) !== 'added') repeated.push(record.id)
    })
    if (loaded.errors.length > 0)
      return finish(
        applied,
        loaded.errors.map((error) => `archive: ${error}`),
      )
    if (repeated.length > 0)
      return finish(applied, [
        `archive repeats ${String(repeated.length)} conversation ids; a rewrite needs one record per id (first: ${repeated[0] ?? ''})`,
      ])

    let backup: string | undefined
    let prunedBackups: string[] = []
    const manifest = await withArchiveWriteLock(options.archive, async () => {
      if ((await readArchiveRevision(options.archive)) !== mergedFrom)
        throw new ConversationArchiveChangedError(options.archive)
      backup = await backupConversationArchive(
        options.archive,
        options.now ?? new Date(),
      )
      const written = await writeConversationExportFromStore(
        store,
        options.archive,
        options.now,
        preview.manifest?.skipped ?? [],
        async () => {
          const temporary = `${options.archive}.tmp-${String(process.pid)}`
          const again = count()
          const verified = await streamConversationExport(
            temporary,
            (record) => {
              rewriteConversationRecord(record, homes, again)
            },
          )
          const problems = [
            ...verified.errors,
            ...(verified.records === store.count()
              ? []
              : [
                  `replacement holds ${String(verified.records)} records, store holds ${String(store.count())}`,
                ]),
            ...(again.changed === 0
              ? []
              : [
                  `replacement is not a fixed point: ${String(again.changed)} records would change again`,
                ]),
          ]
          if (problems.length > 0)
            throw new Error(`rewrite refused: ${problems.join('; ')}`)
          if ((await readArchiveRevision(options.archive)) !== mergedFrom)
            throw new ConversationArchiveChangedError(options.archive)
        },
      )
      if (backup !== undefined)
        prunedBackups = await pruneConversationArchiveBackups(
          options.archive,
          backup,
        )
      return written
    })
    const published = await readArchiveRevision(options.archive)
    return finish(
      applied,
      published === manifest.contentSha256
        ? []
        : ['archive on disk does not carry the manifest that was written'],
      {
        applied: true,
        contentSha256: manifest.contentSha256,
        ...(backup === undefined ? {} : { backup }),
        ...(prunedBackups.length === 0 ? {} : { prunedBackups }),
      },
    )
  } finally {
    store.close()
    await rm(directory, { recursive: true, force: true })
  }
}
