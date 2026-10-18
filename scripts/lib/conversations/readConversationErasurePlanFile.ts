import { promises as fs } from 'node:fs'
import { validateConversationErasurePlan } from './validators/validateConversationErasurePlan'

/** Read an erasure plan file, refusing anything that is not a well-formed v2 plan. */
export const readConversationErasurePlanFile = async (path: string) => {
  try {
    return validateConversationErasurePlan(
      JSON.parse(await fs.readFile(path, 'utf8')) as unknown,
    )
  } catch (error) {
    throw new Error(
      `${path}: ${error instanceof Error ? error.message : 'unreadable'}`,
      { cause: error },
    )
  }
}
