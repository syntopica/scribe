/**
 * Whether a labelled value is a file path rather than a credential.
 *
 * An object-storage listing prints `key: 'exports/raw/2026-10-20/part_1/manifest.json'`,
 * which the inline pattern reads as a `key` holding a token. A credential has
 * no run of slash-separated segments ending in a file extension: base64 keys
 * hold slashes, but not two empty-free segments followed by `.json`.
 */
export const isFilePathValue = (value: string) => {
  const segments = value.split('/')
  return (
    segments.length >= 3 &&
    segments.every((segment) => segment !== '') &&
    /\.[A-Za-z]{2,5}$/u.test(value)
  )
}
