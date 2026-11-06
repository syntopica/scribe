import { NON_SECRET_VARIABLE_WORDS } from './constants/NON_SECRET_VARIABLE_WORDS'
import { SECRET_VARIABLE_WORD_PATTERN } from './constants/SECRET_VARIABLE_WORD_PATTERN'

/**
 * Whether an upper-case variable name says it holds a credential. Segments,
 * not substrings: `TOKENIZER` is not a token, and a describing segment
 * (`NON_SECRET_VARIABLE_WORDS`) wins over a credential one.
 */
export const isSecretVariableName = (name: string) => {
  const segments = name.split('_')
  return (
    !segments.some((segment) => NON_SECRET_VARIABLE_WORDS.includes(segment)) &&
    segments.some((segment) => SECRET_VARIABLE_WORD_PATTERN.test(segment))
  )
}
