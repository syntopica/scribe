/** Whether one UTF-16 unit is an ASCII letter or digit. */
export const isAlphanumericCharacter = (character: string) =>
  /^[A-Za-z0-9]$/u.test(character)
