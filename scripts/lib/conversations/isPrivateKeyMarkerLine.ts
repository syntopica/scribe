/** Whether a line starts with a `-----BEGIN` or `-----END` private key marker. */
export const isPrivateKeyMarkerLine = (line: string, edge: 'BEGIN' | 'END') =>
  line.startsWith(`-----${edge} `) && line.includes('PRIVATE KEY-----')
