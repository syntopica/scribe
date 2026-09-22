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
) => {
  const handle = await fs.open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  let carry = ''
  try {
    for await (const chunk of handle.createReadStream({
      autoClose: false,
      encoding: 'utf8',
      highWaterMark: 64 * 1024,
    })) {
      if (typeof chunk !== 'string')
        throw new Error('JSONL stream did not decode as UTF-8 text')
      consumeChunk?.(chunk)
      const lines = `${carry}${chunk}`.split('\n')
      carry = lines.pop() ?? ''
      for (const line of lines) consume(line, true)
      if (Buffer.byteLength(carry) > MAX_CONVERSATION_FILE_BYTES) {
        throw new Error('JSONL line exceeds the 64 MiB safe size limit')
      }
    }
    if (carry !== '') consume(carry, false)
  } finally {
    await handle.close()
  }
}
