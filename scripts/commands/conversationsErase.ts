import { conversationsEraseActivate } from './conversationsEraseActivate'
import { conversationsEraseApply } from './conversationsEraseApply'
import { conversationsErasePlan } from './conversationsErasePlan'
import { conversationsEraseSubcommandName } from './conversationsEraseSubcommandName'
import { conversationsEraseVerify } from './conversationsEraseVerify'

/**
 * `scribe erase plan|apply|verify|activate`: the four reviewed steps of an
 * erasure, each run on its own so a person reads the plan before anything is
 * rewritten and names the generation before anything is selected.
 *
 * Every step requires `--root` and has no default, so the command cannot reach
 * a live archive by omission. Output is JSON on stdout; refusals go to stderr
 * with a non-zero exit.
 */
export const main = async () => {
  const name = conversationsEraseSubcommandName(process.argv)
  switch (name) {
    case 'plan': {
      await conversationsErasePlan(process.argv)
      return
    }
    case 'apply': {
      await conversationsEraseApply(process.argv)
      return
    }
    case 'verify': {
      await conversationsEraseVerify(process.argv)
      return
    }
    case 'activate': {
      await conversationsEraseActivate(process.argv)
      return
    }
    case undefined:
    default: {
      console.error(
        'usage: scribe erase plan|apply|verify|activate --root <root> [flags]',
      )
      process.exitCode = 2
    }
  }
}
