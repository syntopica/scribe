import { join } from 'node:path'

/** Where the drill's verifier keeps its throwaway state: inside `--work`. */
export const recoveryDrillVerifyDirectory = (work: string) =>
  join(work, 'verify-state')
