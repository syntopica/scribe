/** `text` without the quote characters (`"`, `'`, backtick) at either end. */
export const trimConversationQuotes = (text: string) => {
  const quotes = new Set(['"', "'", '`'])
  let start = 0
  let end = text.length
  while (start < end && quotes.has(text.charAt(start))) start++
  while (end > start && quotes.has(text.charAt(end - 1))) end--
  return text.slice(start, end)
}
