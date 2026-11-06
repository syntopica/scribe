/** How many base64 characters and `\n` escapes open `text`. */
export const leadingKeyMaterialLength = (text: string) =>
  /^(?:\\+[rn]|[A-Za-z0-9+/=])*/u.exec(text)?.[0].length ?? 0
