/** A value with both letters and digits; one without them is prose or a binding, not a token. */
export const hasTokenShape = (value: string) =>
  /\d/u.test(value) && /[A-Za-z]/u.test(value)
