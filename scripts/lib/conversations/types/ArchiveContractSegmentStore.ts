/** A throwaway segment store built from the contract fixture home. */
export interface ArchiveContractSegmentStore {
  root: string
  statePath: string
  cleanup: () => Promise<void>
}
