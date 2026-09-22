/**
 * What a base segment writes where later segments write their generation id.
 *
 * A generation is named after the hash of the base segments that open it, so
 * those segments cannot carry the id they are about to produce. They carry
 * this sentinel instead, and `generation.json` lists their hashes: a base
 * segment is trusted because the generation names it, not because it names the
 * generation. Every segment published afterwards binds itself to the real id,
 * which is what stops a stale peer from unioning erased bytes back in.
 */
export const CONVERSATION_BASE_GENERATION_ID = 'base'
