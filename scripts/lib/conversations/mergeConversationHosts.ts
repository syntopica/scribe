/**
 * The union of the hosts two views of one conversation were observed on.
 *
 * Sorted and deduplicated so the result is the same whichever side arrives
 * first, and `undefined` rather than `[]` when neither side carries a host:
 * a record that predates the field keeps serializing exactly as it did.
 */
export const mergeConversationHosts = (
  ...sides: (readonly string[] | undefined)[]
): string[] | undefined => {
  const hosts = [...new Set(sides.flatMap((side) => side ?? []))].toSorted(
    (left, right) => left.localeCompare(right),
  )
  return hosts.length === 0 ? undefined : hosts
}
