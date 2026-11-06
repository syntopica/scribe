/**
 * Whether a labelled value is the rest of a URL cut at its scheme's colon.
 *
 * `Google API key https://www.example.com/a/...` reads to the inline pattern as
 * the label `... https` and the value `//www.example.com/a/...`.
 */
export const isSchemeRelativeUrl = (value: string) => value.startsWith('//')
