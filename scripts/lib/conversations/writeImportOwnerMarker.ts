import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IMPORT_OWNER_FILE } from './constants/IMPORT_OWNER_FILE'

/** Record this process as the owner of an import directory, so a later run can tell it is live. */
export const writeImportOwnerMarker = (directory: string) =>
  writeFile(join(directory, IMPORT_OWNER_FILE), String(process.pid))
