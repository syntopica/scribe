import { addKnownSecretValues } from './addKnownSecretValues'
import { applyRedactionPattern } from './applyRedactionPattern'
import { ASSIGNED_SECRET_KEYS } from './constants/ASSIGNED_SECRET_KEYS'
import { CREDENTIAL_LABEL_MAX_WORDS } from './constants/CREDENTIAL_LABEL_MAX_WORDS'
import { CREDENTIAL_LABEL_PREFIXES } from './constants/CREDENTIAL_LABEL_PREFIXES'
import { CREDENTIAL_LABEL_SUFFIXES } from './constants/CREDENTIAL_LABEL_SUFFIXES'
import { ENVIRONMENT_ASSIGNMENT_PATTERN } from './constants/ENVIRONMENT_ASSIGNMENT_PATTERN'
import { ESCAPED_PRIVATE_KEY_PATTERN } from './constants/ESCAPED_PRIVATE_KEY_PATTERN'
import { INLINE_SECRET_PATTERN } from './constants/INLINE_SECRET_PATTERN'
import { KEY_MATERIAL_RUN_MIN_LENGTH } from './constants/KEY_MATERIAL_RUN_MIN_LENGTH'
import { KNOWN_SECRET_MIN_LENGTH } from './constants/KNOWN_SECRET_MIN_LENGTH'
import { NON_SECRET_VARIABLE_WORDS } from './constants/NON_SECRET_VARIABLE_WORDS'
import { PEM_BODY_PREFIX_MAX_LENGTH } from './constants/PEM_BODY_PREFIX_MAX_LENGTH'
import { PRIVATE_KEY_BEGIN_PATTERN } from './constants/PRIVATE_KEY_BEGIN_PATTERN'
import { PRIVATE_KEY_END_PATTERN } from './constants/PRIVATE_KEY_END_PATTERN'
import { PRIVATE_KEY_MARKER } from './constants/PRIVATE_KEY_MARKER'
import { PUBLIC_KEY_QUALIFIERS } from './constants/PUBLIC_KEY_QUALIFIERS'
import { SECRET_VARIABLE_WORD_PATTERN } from './constants/SECRET_VARIABLE_WORD_PATTERN'
import { SPANISH_TOKEN_LINKS } from './constants/SPANISH_TOKEN_LINKS'
import { VENDOR_TOKEN_PATTERNS } from './constants/VENDOR_TOKEN_PATTERNS'
import { createKnownSecretRedactor } from './createKnownSecretRedactor'
import { hashText } from './hashText'
import { hasTokenShape } from './hasTokenShape'
import { holdsEscapedPrivateKey } from './holdsEscapedPrivateKey'
import { isAlphanumericCharacter } from './isAlphanumericCharacter'
import { isBase64Character } from './isBase64Character'
import { isBoundedOccurrence } from './isBoundedOccurrence'
import { isCodeExpressionValue } from './isCodeExpressionValue'
import { isCodeReferenceValue } from './isCodeReferenceValue'
import { isFilePathValue } from './isFilePathValue'
import { isInlineSecretLabel } from './isInlineSecretLabel'
import { isKnownSecretCandidate } from './isKnownSecretCandidate'
import { isNonSecretValue } from './isNonSecretValue'
import { isPemBodyLine } from './isPemBodyLine'
import { isPemHeaderLine } from './isPemHeaderLine'
import { isPrivateKeyMarkerLine } from './isPrivateKeyMarkerLine'
import { isPrivateKeyMarkerText } from './isPrivateKeyMarkerText'
import { isPrivateKeyMaterial } from './isPrivateKeyMaterial'
import { isSchemeRelativeUrl } from './isSchemeRelativeUrl'
import { isSecretTableLabel } from './isSecretTableLabel'
import { isSecretVariableName } from './isSecretVariableName'
import { isTaxReferenceLabel } from './isTaxReferenceLabel'
import { isTaxReferenceValue } from './isTaxReferenceValue'
import { isVariableNameValue } from './isVariableNameValue'
import { leadingKeyMaterialLength } from './leadingKeyMaterialLength'
import { listConversationSecretTokens } from './listConversationSecretTokens'
import { listRecordRedactedSpans } from './listRecordRedactedSpans'
import { listRedactedSpans } from './listRedactedSpans'
import { looksLikePemBodyLine } from './looksLikePemBodyLine'
import { opensPrivateKeyBlock } from './opensPrivateKeyBlock'
import { redactAssignedSecrets } from './redactAssignedSecrets'
import { redactConversationRecord } from './redactConversationRecord'
import { redactConversationText } from './redactConversationText'
import { redactEnvironmentSecretAssignments } from './redactEnvironmentSecretAssignments'
import { redactEscapedPrivateKeyLine } from './redactEscapedPrivateKeyLine'
import { redactInlinePrivateKeys } from './redactInlinePrivateKeys'
import { redactKeyMaterialRuns } from './redactKeyMaterialRuns'
import { redactLabelledInlineSecrets } from './redactLabelledInlineSecrets'
import { redactPrivateKeyBlocks } from './redactPrivateKeyBlocks'
import { redactSensitiveText } from './redactSensitiveText'

/**
 * A fingerprint of the redactor a redaction plan is applied with.
 *
 * A redaction plan records it, and apply refuses a plan whose redactor has
 * changed since: the reviewed plan described what that redactor would replace.
 * shortcut: hashes the functions' source text, so a reformat also refuses a
 * plan (re-plan), and a new redactor module or pattern constant must be
 * added to this list.
 */
export const conversationRedactorSha256 = () =>
  hashText(
    [
      applyRedactionPattern,
      redactAssignedSecrets,
      redactLabelledInlineSecrets,
      redactEnvironmentSecretAssignments,
      hasTokenShape,
      isFilePathValue,
      isInlineSecretLabel,
      isSecretTableLabel,
      isSecretVariableName,
      isTaxReferenceLabel,
      redactPrivateKeyBlocks,
      redactInlinePrivateKeys,
      redactKeyMaterialRuns,
      leadingKeyMaterialLength,
      holdsEscapedPrivateKey,
      isPrivateKeyMarkerLine,
      redactEscapedPrivateKeyLine,
      ESCAPED_PRIVATE_KEY_PATTERN,
      isCodeExpressionValue,
      isSchemeRelativeUrl,
      redactSensitiveText,
      redactConversationRecord,
      isBase64Character,
      PEM_BODY_PREFIX_MAX_LENGTH,
      isPemBodyLine,
      isPemHeaderLine,
      isPrivateKeyMaterial,
      ASSIGNED_SECRET_KEYS,
      isTaxReferenceValue,
      isVariableNameValue,
      isCodeReferenceValue,
      isNonSecretValue,
      createKnownSecretRedactor,
      isKnownSecretCandidate,
      redactConversationText,
      isBoundedOccurrence,
      isAlphanumericCharacter,
      opensPrivateKeyBlock,
      looksLikePemBodyLine,
      PRIVATE_KEY_BEGIN_PATTERN,
      PRIVATE_KEY_END_PATTERN,
      KEY_MATERIAL_RUN_MIN_LENGTH,
      PRIVATE_KEY_MARKER,
      addKnownSecretValues,
      listRecordRedactedSpans,
      listRedactedSpans,
      listConversationSecretTokens,
      isPrivateKeyMarkerText,
      KNOWN_SECRET_MIN_LENGTH,
      VENDOR_TOKEN_PATTERNS,
      INLINE_SECRET_PATTERN,
      ENVIRONMENT_ASSIGNMENT_PATTERN,
      NON_SECRET_VARIABLE_WORDS,
      SECRET_VARIABLE_WORD_PATTERN,
      CREDENTIAL_LABEL_SUFFIXES,
      CREDENTIAL_LABEL_PREFIXES,
      CREDENTIAL_LABEL_MAX_WORDS,
      PUBLIC_KEY_QUALIFIERS,
      SPANISH_TOKEN_LINKS,
    ]
      .map((redactor) => String(redactor))
      .join('\0'),
  )
