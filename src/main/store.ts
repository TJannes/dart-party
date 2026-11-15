import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Store } from '../core/party/session'

/**
 * Keeps each document as a JSON file in the given folder. A save writes a
 * temporary file and renames it, so a crash mid-write leaves the old file.
 */
export function fileStore(folder: string): Store {
  mkdirSync(folder, { recursive: true })
  const path = (name: string): string => join(folder, `${name}.json`)
  return {
    load(name) {
      try {
        return JSON.parse(readFileSync(path(name), 'utf8'))
      } catch {
        return null
      }
    },
    save(name, data) {
      const temporary = `${path(name)}.tmp`
      writeFileSync(temporary, JSON.stringify(data))
      renameSync(temporary, path(name))
    },
    remove(name) {
      rmSync(path(name), { force: true })
    },
  }
}
