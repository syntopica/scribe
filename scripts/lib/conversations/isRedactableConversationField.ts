/** True for the fields `redactConversationRecord` rewrites: title, workspace, event text. */
export const isRedactableConversationField = (path: string) =>
  /^entry\.record\.(?:title|workspace|events\[\d+\]\.text)$/u.test(path)
