import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { captureConversationArtifacts } from './captureConversationArtifacts'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import type { ConversationSource } from './types/ConversationSource'
import { writeConversationExportFromStore } from './writeConversationExportFromStore'

export const exportConversations = async (
  home: string,
  output: string,
  selectedSources?: ReadonlySet<ConversationSource>,
  allowPartial = false,
  host?: string,
) => {
  const directory = await mkdtemp(
    join(tmpdir(), 'rocket-agents-conversation-export-'),
  )
  const store = new ConversationCaptureStore(join(directory, 'capture.sqlite'))
  try {
    const report = await captureConversationArtifacts(
      home,
      selectedSources,
      (record) => {
        store.mergeFragment(record)
      },
      host,
    )
    // Fail closed by default: a skipped artifact means the export would
    // silently under-represent a source. --allow-partial is the explicit
    // recovery mode; the manifest then records complete:false and every skip,
    // so no partial archive can pass as a full one downstream.
    if (!report.ok && !allowPartial) return { report }
    const redactions = store.redactions()
    return {
      report,
      redactions,
      manifest: await writeConversationExportFromStore(
        store,
        output,
        new Date(),
        report.skipped,
      ),
    }
  } finally {
    store.close()
    await rm(directory, { recursive: true, force: true })
  }
}
