/** The order the archive sorts names in, for tests that compare listings. */
export const compareConversationNames = (left: string, right: string) =>
  left.localeCompare(right)
