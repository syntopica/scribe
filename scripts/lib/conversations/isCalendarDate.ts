/** Whether `text` is a bare ISO calendar date, such as `2026-10-20`. */
export const isCalendarDate = (text: string) =>
  /^\d{4}-\d{2}-\d{2}$/u.test(text)
