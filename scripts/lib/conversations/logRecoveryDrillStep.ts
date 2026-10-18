/**
 * Say on stderr where the drill is. The report is printed only at the end,
 * hours later on a slow disk, so each step announces its start and outcome.
 */
export const logRecoveryDrillStep = (step: string, event: string) =>
  process.stderr.write(
    `${new Date().toISOString()} recovery-drill ${step} ${event}\n`,
  )
