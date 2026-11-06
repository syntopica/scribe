import { isAlphanumericCharacter } from './isAlphanumericCharacter'

/**
 * Whether `length` units of `text` from `start` stand as a token of their own.
 *
 * An edge that is a letter or digit must meet a non-alphanumeric neighbour or
 * the end of the text: eight characters of a removed key found inside an
 * unrelated hash are a coincidence, not a copy. An edge that is punctuation is
 * a boundary already.
 */
export const isBoundedOccurrence = (
  text: string,
  start: number,
  length: number,
) => {
  const end = start + length
  const opens =
    start === 0 ||
    !isAlphanumericCharacter(text.charAt(start)) ||
    !isAlphanumericCharacter(text.charAt(start - 1))
  const closes =
    end === text.length ||
    !isAlphanumericCharacter(text.charAt(end - 1)) ||
    !isAlphanumericCharacter(text.charAt(end))
  return opens && closes
}
