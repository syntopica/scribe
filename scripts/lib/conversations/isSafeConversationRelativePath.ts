import { isAbsolute, normalize, sep } from 'node:path'

export const isSafeConversationRelativePath = (path: string) => {
  const normalized = normalize(path)
  return (
    path !== '' &&
    !isAbsolute(path) &&
    normalized !== '..' &&
    !normalized.startsWith(`..${sep}`)
  )
}
