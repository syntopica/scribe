import { addKnownSecretValues } from './addKnownSecretValues'
import { streamConversationExport } from './streamConversationExport'

/**
 * Every token-shaped value the pattern redactor removes from a v1 archive, in
 * one streaming pass, so the rewrite also removes their bare copies.
 */
export const collectArchiveKnownSecretValues = async (archive: string) => {
  const values = new Set<string>()
  const streamed = await streamConversationExport(archive, (record) => {
    addKnownSecretValues(record, values)
  })
  return { values, errors: streamed.errors }
}
