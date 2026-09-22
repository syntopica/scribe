/**
 * Report a command that died outside its own error handling, cause included.
 *
 * The entrypoints used to catch with `() => {}` and print a fixed line. That
 * turned every unexpected failure into the same sentence with no stack, no
 * errno and no path: a first import on a freshly provisioned host failed for
 * days behind "Conversation import failed unexpectedly" when the real error
 * was an ENOENT naming the exact missing directory. A summary line is worth
 * keeping -- it says which command died -- but never on its own.
 */
export const reportUnexpectedFailure = (summary: string, error: unknown) => {
  console.error(summary)
  console.error(error)
  process.exitCode = 2
}
