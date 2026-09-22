/**
 * 2 since 2026-08-31: event ids carry the conversation they belong to. Version
 * 1 records are still read - an archive holds years of them - and are never
 * merged with a version 2 capture of the same conversation, because the same
 * event carries a different id under each rule.
 */
export const CONVERSATION_SCHEMA_VERSION = 2 as const
