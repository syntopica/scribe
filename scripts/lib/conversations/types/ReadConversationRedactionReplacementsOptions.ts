/** The generation a redaction plan was computed against, and what it planned. */
export interface ReadConversationRedactionReplacementsOptions {
  root: string
  generationId: string
  planned: ReadonlySet<string>
}
