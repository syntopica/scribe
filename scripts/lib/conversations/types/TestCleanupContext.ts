/** The part of a `node:test` context a fixture needs to clean up after itself. */
export interface TestCleanupContext {
  after: (cleanup: () => Promise<void>) => void
}
