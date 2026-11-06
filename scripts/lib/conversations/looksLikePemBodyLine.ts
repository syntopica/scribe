/**
 * Whether a line reads as part of a PEM body: it ends in a run of at least 40
 * base64 characters (whatever prefix a printout put before it), or it is an
 * RFC 1421 header such as `Proc-Type: 4,ENCRYPTED`.
 */
export const looksLikePemBodyLine = (line: string | undefined) =>
  line !== undefined &&
  (/[A-Za-z0-9+/=]{40}$/u.test(line.trimEnd()) ||
    /^[A-Za-z-]+: \S/u.test(line.trimStart()))
