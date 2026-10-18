import { applyRedactionPattern } from './applyRedactionPattern'
import { hashText } from './hashText'
import { redactAssignedSecrets } from './redactAssignedSecrets'
import { redactConversationRecord } from './redactConversationRecord'
import { redactPrivateKeyBlocks } from './redactPrivateKeyBlocks'
import { redactSensitiveText } from './redactSensitiveText'

/**
 * A fingerprint of the redactor a redaction plan is applied with.
 *
 * A redaction plan records it, and apply refuses a plan whose redactor has
 * changed since: the reviewed plan described what that redactor would replace.
 * shortcut: hashes the functions' source text, so a reformat also refuses a
 * plan (re-plan), and a new redactor module must be added to this list.
 */
export const conversationRedactorSha256 = () =>
  hashText(
    [
      applyRedactionPattern,
      redactAssignedSecrets,
      redactPrivateKeyBlocks,
      redactSensitiveText,
      redactConversationRecord,
    ]
      .map((redactor) => redactor.toString())
      .join('\0'),
  )
