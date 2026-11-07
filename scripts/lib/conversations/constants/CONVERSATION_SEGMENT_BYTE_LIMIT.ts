/**
 * How many serialized characters one segment carries before the capture
 * publishes it, beside the fragment count bound.
 *
 * The count bound alone assumes small fragments. On 2026-11-06 a MacBook
 * capture staged 2,000 fragments whose serialized text passed V8's maximum
 * string length, so every pass died in `Array.join` with `RangeError: Invalid
 * string length` and published nothing for a day. Bounding the bytes keeps a
 * segment far below that ceiling whatever the fragments weigh.
 */
export const CONVERSATION_SEGMENT_BYTE_LIMIT = 64 * 1024 * 1024
