import { resolve } from 'node:path'
import { renderConversationArchive } from '../lib/conversations/renderConversationArchive'
import { flagValue } from '../lib/machine/cli/flagValue'

export const main = async () => {
  const requestedInput = flagValue(process.argv, '--input')
  const requestedOutput = flagValue(process.argv, '--output-dir')
  if (requestedInput === undefined || requestedOutput === undefined) {
    console.error('--input and --output-dir are required')
    process.exitCode = 2
    return
  }

  const result = await renderConversationArchive({
    input: resolve(requestedInput),
    outputDirectory: resolve(requestedOutput),
    apply: process.argv.includes('--apply'),
  })
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.ok ? 0 : 1
}
