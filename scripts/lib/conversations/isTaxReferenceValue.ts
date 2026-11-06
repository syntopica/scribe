/**
 * Whether a value has the shape of an AEAT liquidation or debt key: one
 * letter and sixteen digits. Labelled `clave`, it reads as a key, and it
 * recurs in every session about the tax position.
 */
export const isTaxReferenceValue = (value: string) =>
  /^[A-Z]\d{16}$/u.test(value)
