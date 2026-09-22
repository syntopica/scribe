import { promises as fs } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { loadConversationExportStore } from './loadConversationExportStore'
import { renderConversationRecordMarkdown } from './renderConversationRecordMarkdown'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationRenderResult } from './types/ConversationRenderResult'

export const renderConversationArchive = async (options: {
  input: string
  outputDirectory: string
  apply: boolean
}): Promise<ConversationRenderResult> => {
  const directory = await mkdtemp(
    join(tmpdir(), 'rocket-agents-conversation-render-'),
  )
  const store = new ConversationCaptureStore(join(directory, 'capture.sqlite'))
  try {
    const archive = await loadConversationExportStore(options.input, store)
    if (archive.errors.length > 0) {
      return {
        ok: false,
        applied: false,
        files: 0,
        outputDirectory: options.outputDirectory,
        errors: archive.errors,
      }
    }

    if (options.apply) {
      await fs.mkdir(options.outputDirectory, { recursive: true, mode: 0o700 })
      for (const serialized of store.serializedRecords()) {
        const record = JSON.parse(serialized) as ConversationRecord
        const output = join(options.outputDirectory, `${record.id}.md`)
        const temporary = `${output}.tmp-${String(process.pid)}`
        await fs.writeFile(
          temporary,
          renderConversationRecordMarkdown(record),
          { mode: 0o600 },
        )
        await fs.rename(temporary, output)
      }
    }

    return {
      ok: true,
      applied: options.apply,
      files: store.count(),
      outputDirectory: options.outputDirectory,
      errors: [],
    }
  } finally {
    store.close()
    await rm(directory, { recursive: true, force: true })
  }
}
