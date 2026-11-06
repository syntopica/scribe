import type { RedactedText } from './RedactedText'

/** Replaces every bounded copy of the archive's known removed values in a text. */
export type KnownSecretRedactor = (text: string) => RedactedText
