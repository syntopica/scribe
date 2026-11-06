/**
 * Whether a value is the name of an environment variable, such as
 * `CONTEXT7_API_KEY`: a config that says which variable holds the key, not
 * the key. Uppercase words joined by underscores; a credential is not.
 */
export const isVariableNameValue = (value: string) =>
  /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/u.test(value)
