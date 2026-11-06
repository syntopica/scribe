import { applyRedactionPattern } from './applyRedactionPattern'
import { CREDENTIAL_LABEL_MAX_WORDS } from './constants/CREDENTIAL_LABEL_MAX_WORDS'
import { CREDENTIAL_LABEL_PREFIXES } from './constants/CREDENTIAL_LABEL_PREFIXES'
import { CREDENTIAL_LABEL_SUFFIXES } from './constants/CREDENTIAL_LABEL_SUFFIXES'
import { ENVIRONMENT_ASSIGNMENT_PATTERN } from './constants/ENVIRONMENT_ASSIGNMENT_PATTERN'
import { INLINE_SECRET_PATTERN } from './constants/INLINE_SECRET_PATTERN'
import { PUBLIC_KEY_QUALIFIERS } from './constants/PUBLIC_KEY_QUALIFIERS'
import { SECRET_VARIABLE_NAME_PATTERN } from './constants/SECRET_VARIABLE_NAME_PATTERN'
import { SPANISH_TOKEN_LINKS } from './constants/SPANISH_TOKEN_LINKS'
import { VENDOR_TOKEN_PATTERNS } from './constants/VENDOR_TOKEN_PATTERNS'
import { hashText } from './hashText'
import { hasTokenShape } from './hasTokenShape'
import { isInlineSecretLabel } from './isInlineSecretLabel'
import { isSecretTableLabel } from './isSecretTableLabel'
import { redactAssignedSecrets } from './redactAssignedSecrets'
import { redactConversationRecord } from './redactConversationRecord'
import { redactEnvironmentSecretAssignments } from './redactEnvironmentSecretAssignments'
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
      isInlineSecretLabel,
      isSecretTableLabel,
      redactPrivateKeyBlocks,
      redactSensitiveText,
      redactConversationRecord,
      VENDOR_TOKEN_PATTERNS,
      INLINE_SECRET_PATTERN,
      ENVIRONMENT_ASSIGNMENT_PATTERN,
      SECRET_VARIABLE_NAME_PATTERN,
      CREDENTIAL_LABEL_SUFFIXES,
      CREDENTIAL_LABEL_PREFIXES,
      CREDENTIAL_LABEL_MAX_WORDS,
      PUBLIC_KEY_QUALIFIERS,
      SPANISH_TOKEN_LINKS,
    ]
      .map((redactor) => String(redactor))
      .join('\0'),
  )
