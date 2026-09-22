import type { ConversationSourceStatus } from './ConversationSourceStatus'

/**
 * What a capture actually did, in numbers a threshold can be asserted against.
 *
 * The acceptance test for this format is not "it feels faster": a warm no-op
 * must report zero payload bytes read, zero records normalized and no segment
 * written, and a one-artifact change must read only that artifact's bytes.
 * Both are claims about these fields, so they are produced by the capture
 * rather than reconstructed by an observer afterwards.
 */
export interface ConversationIncrementalCaptureMetrics {
  ok: boolean
  discovered: number
  statted: number
  cacheHits: number
  fullyParsed: number
  unreadable: number
  unstableReads: number
  forgottenArtifacts: number
  payloadBytesRead: number
  recordsNormalized: number
  sources: ConversationSourceStatus[]
  skipped: string[]
}
