import { SCRIBE_COMMANDS } from './SCRIBE_COMMANDS'
import { scribeUsage } from './scribeUsage'

/**
 * Run one subcommand. Each command reads its own flags from `process.argv`,
 * wherever they sit, so the subcommand name is simply left in place. A leading
 * `--`, which `pnpm run scribe -- <command>` may forward, is skipped.
 */
export const main = async () => {
  const name = process.argv[2] === '--' ? process.argv[3] : process.argv[2]
  if (name === undefined || name === '--help' || name === '-h') {
    console.log(scribeUsage())
    return
  }
  const command = SCRIBE_COMMANDS[name]
  if (command === undefined) {
    console.error(`scribe: unknown command '${name}'\n\n${scribeUsage()}`)
    process.exitCode = 2
    return
  }
  const module = await command.load()
  await module.main()
}
