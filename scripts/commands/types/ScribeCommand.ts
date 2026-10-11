/** One `scribe` subcommand: what it does, and how to load the module that runs it. */
export interface ScribeCommand {
  readonly summary: string
  readonly load: () => Promise<{ main: () => Promise<void> }>
}
