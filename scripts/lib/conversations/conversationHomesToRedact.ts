import { homedir } from 'node:os'

/**
 * The home prefixes a capture redacts: the root it was pointed at, and the
 * account's own home whenever that differs.
 *
 * They differ when a capture reads artifacts from somewhere other than the
 * home they were written under: a recovery sweep, a mirror of another Mac.
 * Every one of the 5,121 claude-code records in the archive whose workspace
 * still carried an absolute `/Users/...` path came through such a run (their
 * provenance names a `recovered-from-memstore/sweep/` root): the redaction
 * knew only the root it was given, and the paths inside the sessions named
 * the real home. Longest prefix first, so a root inside the home is reduced
 * to `[HOME]` before the home itself is.
 */
export const conversationHomesToRedact = (home: string) =>
  [...new Set([home, homedir()])]
    .filter((candidate) => candidate.length > 1)
    .toSorted((left, right) => right.length - left.length)
