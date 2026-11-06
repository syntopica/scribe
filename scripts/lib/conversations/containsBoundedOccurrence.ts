import { isBoundedOccurrence } from './isBoundedOccurrence'

/** Whether `needle` occurs in `text` as a token of its own (`isBoundedOccurrence`). */
export const containsBoundedOccurrence = (text: string, needle: string) => {
  for (
    let start = text.indexOf(needle);
    start !== -1;
    start = text.indexOf(needle, start + 1)
  )
    if (isBoundedOccurrence(text, start, needle.length)) return true
  return false
}
