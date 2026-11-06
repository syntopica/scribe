/**
 * Whether a value is a dotted reference into code, such as
 * `process.env.STRIPE_SECRET_KEY` or `metrics.done_1h`: identifier segments
 * after a lowercase root. A JWT also has dots, but its segments open with
 * `eyJ`, never a lowercase word.
 */
export const isCodeReferenceValue = (value: string) => {
  const segments = value.split('.')
  return (
    segments.length >= 2 &&
    /^[a-z]+$/u.test(segments[0] ?? '') &&
    segments.every((segment) => /^[A-Za-z_$][\w$]*$/u.test(segment))
  )
}
