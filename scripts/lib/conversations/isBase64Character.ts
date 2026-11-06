/** Whether one UTF-16 unit belongs to the base64 alphabet. */
export const isBase64Character = (character: string) =>
  /^[A-Za-z0-9+/=]$/u.test(character)
