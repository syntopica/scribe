/** `text` without the characters at either end that are neither letters nor digits. */
export const trimConversationPunctuation = (text: string) => {
  const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character)
  let start = 0
  let end = text.length
  while (start < end && !isWordCharacter(text.charAt(start))) start++
  while (end > start && !isWordCharacter(text.charAt(end - 1))) end--
  return text.slice(start, end)
}
