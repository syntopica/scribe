/** The disposable root to inject into, the unique marker, and the clock. */
export interface RecoveryDrillConversationOptions {
  root: string
  marker: string
  createdAt: string
  migrationFrozen: boolean
}
