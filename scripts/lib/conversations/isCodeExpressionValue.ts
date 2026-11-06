/**
 * Whether an assigned value is a code expression or a placeholder rather than
 * a literal.
 *
 * `SECRET=crypto.randomBytes(32).toString('hex')` names how a secret is made,
 * `KEY = process.argv[3]` where it comes from, and `KEY = "[HOME]/.ssh/..."`
 * an already-redacted path; the census of 2026-11-06 found each in hundreds of
 * other fragments. A literal credential holds no parenthesis or bracket.
 */
export const isCodeExpressionValue = (value: string) => /[()[\]]/u.test(value)
