/**
 * How many conversations the disposable state writes per transaction when it
 * rematerializes or marks them in bulk. One commit per row cost about 28 ms on
 * a USB disk, close to an hour per full-archive rebuild; a bounded batch keeps
 * that to a few seconds without holding one transaction across the archive.
 */
export const CONVERSATION_STATE_BATCH_SIZE = 1000
