import { CONVERSATION_CAPTURE_VERSIONS } from './constants/CONVERSATION_CAPTURE_VERSIONS'

/**
 * The capture versions as the single string a cache row stores and compares.
 *
 * The host label is part of it: a cache hit skips the artifact entirely, so a
 * machine renamed under `ROCKET_AGENTS_HOST` would otherwise never record its
 * new name against the artifacts it already read.
 */
export const conversationCaptureVersionStamp = (host?: string) =>
  `n${String(CONVERSATION_CAPTURE_VERSIONS.normalizer)}.r${String(
    CONVERSATION_CAPTURE_VERSIONS.redactor,
  )}.a${String(CONVERSATION_CAPTURE_VERSIONS.adapter)}${
    host === undefined ? '' : `@${host}`
  }`
