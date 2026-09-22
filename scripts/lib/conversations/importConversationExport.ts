import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupConversationArchive } from './backupConversationArchive'
import { ConversationArchiveChangedError } from './ConversationArchiveChangedError'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { loadConversationExportStore } from './loadConversationExportStore'
import { pruneConversationArchiveBackups } from './pruneConversationArchiveBackups'
import { readArchiveRevision } from './readArchiveRevision'
import type { ConversationImportResult } from './types/ConversationImportResult'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeConversationExportFromStore } from './writeConversationExportFromStore'

export const importConversationExport = async (options: {
  input: string
  archive: string
  apply: boolean
  now?: Date
}): Promise<ConversationImportResult> => {
  const directory = await mkdtemp(
    join(tmpdir(), 'rocket-agents-conversation-import-'),
  )
  const store = new ConversationCaptureStore(join(directory, 'capture.sqlite'))
  try {
    // Captured before the merge and verified after it. An import reads the
    // archive, merges for as long as that takes, then writes the result back;
    // without this, a second writer finishing in between has its conversations
    // replaced by this one's older view, and nothing says so.
    const mergedFrom = await readArchiveRevision(options.archive)
    try {
      const existing = await loadConversationExportStore(options.archive, store)
      if (existing.errors.length > 0) {
        return {
          ok: false,
          applied: false,
          added: 0,
          duplicates: 0,
          updated: 0,
          total: 0,
          archive: options.archive,
          errors: existing.errors.map((error) => `existing archive: ${error}`),
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    const changes = { added: 0, duplicate: 0, updated: 0 }
    const incoming = await loadConversationExportStore(
      options.input,
      store,
      changes,
    )
    if (incoming.errors.length > 0) {
      return {
        ok: false,
        applied: false,
        added: 0,
        duplicates: 0,
        updated: 0,
        total: 0,
        archive: options.archive,
        errors: incoming.errors,
      }
    }

    let backup: string | undefined
    let prunedBackups: string[] = []
    if (options.apply) {
      await withArchiveWriteLock(options.archive, async () => {
        if ((await readArchiveRevision(options.archive)) !== mergedFrom)
          throw new ConversationArchiveChangedError(options.archive)
        backup = await backupConversationArchive(
          options.archive,
          options.now ?? new Date(),
        )
        await writeConversationExportFromStore(
          store,
          options.archive,
          options.now,
          [],
          // Writing the replacement takes as long as the merge did, so the
          // check above has aged by a whole publication before the rename.
          // Take it again against the archive as it is now.
          async () => {
            if ((await readArchiveRevision(options.archive)) !== mergedFrom)
              throw new ConversationArchiveChangedError(options.archive)
          },
        )
        // The archive is replaced, so the copy taken above is the previous
        // generation and every older backup is surplus. Pruned only after the
        // rename: a failed write leaves all of them in place.
        if (backup !== undefined)
          prunedBackups = await pruneConversationArchiveBackups(
            options.archive,
            backup,
          )
      })
    }
    return {
      ok: true,
      applied: options.apply,
      added: changes.added,
      duplicates: changes.duplicate,
      updated: changes.updated,
      total: store.count(),
      archive: options.archive,
      ...(backup === undefined ? {} : { backup }),
      ...(prunedBackups.length === 0 ? {} : { prunedBackups }),
      errors: [],
    }
  } finally {
    store.close()
    await rm(directory, { recursive: true, force: true })
  }
}
