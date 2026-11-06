import { isCodeExpressionValue } from './isCodeExpressionValue'
import { isCodeReferenceValue } from './isCodeReferenceValue'
import { isTaxReferenceValue } from './isTaxReferenceValue'
import { isVariableNameValue } from './isVariableNameValue'

/**
 * Whether a value found after a credential label or name is known not to be
 * one: code, a reference into code, a variable name or a tax reference.
 */
export const isNonSecretValue = (value: string) =>
  isCodeExpressionValue(value) ||
  isCodeReferenceValue(value) ||
  isVariableNameValue(value) ||
  isTaxReferenceValue(value)
