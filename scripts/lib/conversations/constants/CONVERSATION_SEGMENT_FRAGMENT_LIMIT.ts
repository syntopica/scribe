/**
 * How many fragments one segment carries before the capture publishes it.
 *
 * A capture holds its staged fragments in memory until they are written, so
 * without a bound the first pass over a cold archive stages the entire corpus:
 * measured at 25,000 synthetic artifacts, peak RSS reached 602 MB and the
 * single segment was 44 MB. Segments are a set, so publishing several from one
 * pass changes nothing about the result and keeps the peak proportional to
 * this number rather than to the size of the archive.
 */
export const CONVERSATION_SEGMENT_FRAGMENT_LIMIT = 2000
