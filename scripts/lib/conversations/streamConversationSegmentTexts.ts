/**
 * One async stream of segment texts, whether the caller had an array or a
 * generator.
 *
 * Sealing accepts both because the migration streams gigabytes and the tests
 * pass a literal list. Declaring the result as `AsyncGenerator<string>` also
 * gives the sealing loop a single element type: typescript-eslint, checking
 * the whole project, resolved `for await` over the union to `any` depending on
 * which file it checked first.
 */
export const streamConversationSegmentTexts = async function* (
  source: AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<string> {
  yield* source
}
