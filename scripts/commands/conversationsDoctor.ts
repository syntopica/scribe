import { homedir } from 'node:os'
import { formatConversationDoctor } from '../lib/conversations/formatters/formatConversationDoctor'
import { inspectConversationSources } from '../lib/conversations/inspectConversationSources'
import { parseConversationSources } from '../lib/conversations/parseConversationSources'
import { flagValue } from '../lib/machine/cli/flagValue'
import { flagValues } from '../lib/machine/cli/flagValues'

export const main = async () => {
  const home = flagValue(process.argv, '--home') ?? homedir()
  const selection = parseConversationSources(
    flagValues(process.argv, '--source'),
  )
  if (selection.errors.length > 0) {
    console.error(selection.errors.join('\n'))
    process.exitCode = 2
    return
  }

  const { artifacts, statuses } = await inspectConversationSources(
    home,
    selection.sources,
  )
  const output = {
    ok: true,
    home: '[HOME]',
    artifacts: artifacts.length,
    sources: statuses,
  }
  console.log(
    process.argv.includes('--json')
      ? JSON.stringify(output, null, 2)
      : formatConversationDoctor(statuses),
  )
}
