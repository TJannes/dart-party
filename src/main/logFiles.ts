import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LogFiles } from '../core/log/partyLog'

/** The party logs as plain files in one folder. */
export function logFiles(folder: string): LogFiles {
  mkdirSync(folder, { recursive: true })
  const path = (name: string): string => join(folder, name)
  return {
    list: () => readdirSync(folder),
    read(name) {
      try {
        return readFileSync(path(name), 'utf8')
      } catch {
        return null
      }
    },
    write: (name, text) => writeFileSync(path(name), text),
    append: (name, text) => appendFileSync(path(name), text),
    remove: (name) => rmSync(path(name), { force: true }),
  }
}
