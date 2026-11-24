// One exported record is a whole conversation assembled from many provider
// files, so the per-file bound does not hold for it: the live archive carries
// an 85 MB record. The ceiling stays under V8's maximum string length.
export const MAX_CONVERSATION_RECORD_BYTES = 256 * 1024 * 1024
