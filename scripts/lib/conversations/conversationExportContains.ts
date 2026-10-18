import { forEachLfLine } from './forEachLfLine'

/** True when any line of the export at `path` contains `text`, read one line at a time. */
export const conversationExportContains = async (
  path: string,
  text: string,
) => {
  let found = false
  await forEachLfLine(path, (line) => {
    if (line.includes(text)) found = true
  })
  return found
}
