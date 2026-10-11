#!/usr/bin/env -S npx tsx
import { main } from '../commands/scribeMain'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('scribe failed unexpectedly', error)
})
