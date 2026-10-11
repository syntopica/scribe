import { SCRIBE_COMMANDS } from './SCRIBE_COMMANDS'

/** The text `scribe --help` prints: one line per subcommand. */
export const scribeUsage = (): string => {
  const width = Math.max(
    ...Object.keys(SCRIBE_COMMANDS).map((name) => name.length),
  )
  const lines = Object.entries(SCRIBE_COMMANDS).map(
    ([name, command]) => `  ${name.padEnd(width)}  ${command.summary}`,
  )
  return ['usage: scribe <command> [flags]', '', 'commands:', ...lines].join(
    '\n',
  )
}
