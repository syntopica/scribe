/**
 * The word after `erase`, whether the command was reached as `scribe erase
 * <name>` or through the `conversations:erase` package script, where argv
 * starts at `<name>`. A `--` that pnpm forwards is skipped either way.
 */
export const conversationsEraseSubcommandName = (argv: readonly string[]) => {
  const words = argv.slice(2).filter((word) => word !== '--')
  return words[0] === 'erase' ? words[1] : words[0]
}
