/** The archive to seed, the staged copy in archive layout, and the generation. */
export interface SeedConversationArchiveGenerationOptions {
  root: string
  from: string
  generationId: string
  /** `--migration-frozen`: a cutover step that runs inside the writer freeze. */
  migrationFrozen?: boolean
}
