import { Buffer } from 'node:buffer'
import { constants, promises as fs } from 'node:fs'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'

export const forEachLfLine = async (
  path: string,
  consume: (line: string, terminated: boolean) => void,
  // Raw decoded chunks, in order, for callers that have to hash the file as it
  // is on disk: reassembling the bytes from the lines loses the distinction
  // between a final line that is terminated and one that is not.
  consumeChunk?: (chunk: string) => void,
  // Provider files keep the per-file bound; a reader of scribe's own exports
  // passes the larger record bound.
  maxLineBytes: number = MAX_CONVERSATION_FILE_BYTES,
) => {
  const handle = await fs.open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  // The unterminated tail is kept as the pieces it arrived in and joined once,
  // when its newline arrives: concatenating it with every 64 KiB chunk and
  // splitting the whole again made a line of n bytes cost O(n^2), which on the
  // 9.6 GB archive kept an import busy for over an hour after its last read.
  let carry: string[] = []
  let carryBytes = 0
  try {
    for await (const chunk of handle.createReadStream({
      autoClose: false,
      encoding: 'utf8',
      highWaterMark: 64 * 1024,
    })) {
      if (typeof chunk !== 'string')
        throw new Error('JSONL stream did not decode as UTF-8 text')
      consumeChunk?.(chunk)
      let start = 0
      let end = chunk.indexOf('\n')
      while (end !== -1) {
        const tail = chunk.slice(start, end)
        const line = carry.length === 0 ? tail : carry.join('') + tail
        carry = []
        carryBytes = 0
        consume(line, true)
        start = end + 1
        end = chunk.indexOf('\n', start)
      }
      if (start < chunk.length) {
        const rest = chunk.slice(start)
        carry.push(rest)
        carryBytes += Buffer.byteLength(rest)
      }
      if (carryBytes > maxLineBytes) {
        throw new Error(
          `JSONL line exceeds the ${String(maxLineBytes / (1024 * 1024))} MiB safe size limit`,
        )
      }
    }
    if (carry.length > 0) consume(carry.join(''), false)
  } finally {
    await handle.close()
  }
}
