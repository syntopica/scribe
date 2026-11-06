/**
 * Whether an assigned value is a code expression rather than a literal.
 *
 * `SECRET=crypto.randomBytes(32).toString('hex')` names how a secret is made,
 * and the census of 2026-11-06 found that expression in 588 other fragments.
 * A literal credential holds no parenthesis.
 */
export const isCodeExpressionValue = (value: string) => /[()]/u.test(value)
