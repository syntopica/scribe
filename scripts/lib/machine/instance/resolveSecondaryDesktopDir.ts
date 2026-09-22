/**
 * Claude Desktop's Application Support folder for the second profile.
 *
 * Instance data, like `resolveSecondaryProfileDir`. A second desktop profile
 * writes beside the first one with the same account uuid -- 231 files on the
 * MacBook on 2026-09-09, captured by nothing until this root was listed -- so
 * the export has to know the folder exists, without this repository knowing
 * whose it is. `CLAUDE_SECONDARY_DESKTOP_DIR` declares it; the default names
 * nobody.
 */
export const resolveSecondaryDesktopDir = (env: NodeJS.ProcessEnv): string =>
  env['CLAUDE_SECONDARY_DESKTOP_DIR'] ?? 'Claude-secondary'
