import { stat } from 'node:fs/promises'

export const pathExists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  )
