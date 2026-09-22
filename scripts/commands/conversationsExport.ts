import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { conversationPathExists } from '../lib/conversations/conversationPathExists'
import { exportConversations } from '../lib/conversations/exportConversations'
import { parseConversationSources } from '../lib/conversations/parseConversationSources'
import { flagValue } from '../lib/machine/cli/flagValue'
import { flagValues } from '../lib/machine/cli/flagValues'

export const main = async () => {
  const requestedOutput = flagValue(process.argv, '--output')
  if (requestedOutput === undefined) {
    console.error('--output is required')
    process.exitCode = 2
    return
  }

  const selection = parseConversationSources(
    flagValues(process.argv, '--source'),
  )
  if (selection.errors.length > 0) {
    console.error(selection.errors.join('\n'))
    process.exitCode = 2
    return
  }

  const home = flagValue(process.argv, '--home') ?? homedir()
  const output = resolve(requestedOutput)
  if (
    (await conversationPathExists(output)) &&
    !process.argv.includes('--force')
  ) {
    console.error('output already exists; choose another path or pass --force')
    process.exitCode = 2
    return
  }
  const allowPartial = process.argv.includes('--allow-partial')
  const { report, manifest, redactions } = await exportConversations(
    home,
    output,
    selection.sources,
    allowPartial,
  )
  if (!report.ok && !allowPartial) {
    console.error(
      JSON.stringify({ ok: false, errors: report.skipped }, null, 2),
    )
    process.exitCode = 1
    return
  }

  if (manifest === undefined)
    throw new Error('conversation export manifest was not created')
  console.log(
    JSON.stringify(
      {
        ok: true,
        complete: manifest.complete !== false,
        output,
        records: manifest.records,
        redactions,
        sources: report.sources,
        contentSha256: manifest.contentSha256,
        ...(manifest.skipped === undefined
          ? {}
          : { skipped: manifest.skipped }),
      },
      null,
      2,
    ),
  )
}
