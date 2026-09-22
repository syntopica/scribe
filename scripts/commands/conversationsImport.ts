import { resolve } from 'node:path'
import { importConversationExport } from '../lib/conversations/importConversationExport'
import { flagValue } from '../lib/machine/cli/flagValue'

export const main = async () => {
  const requestedInput = flagValue(process.argv, '--input')
  const requestedArchive = flagValue(process.argv, '--archive')
  if (requestedInput === undefined || requestedArchive === undefined) {
    console.error('--input and --archive are required')
    process.exitCode = 2
    return
  }

  const result = await importConversationExport({
    input: resolve(requestedInput),
    archive: resolve(requestedArchive),
    apply: process.argv.includes('--apply'),
  })
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.ok ? 0 : 1
}
