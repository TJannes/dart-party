import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fileStore } from './store'

let folder: string
beforeEach(() => (folder = mkdtempSync(join(tmpdir(), 'dart-party-'))))
afterEach(() => rmSync(folder, { recursive: true, force: true }))

describe('fileStore', () => {
  it('gives back what was saved, also through a new store', () => {
    fileStore(folder).save('evening', { a: [1, 2] })
    expect(fileStore(folder).load('evening')).toEqual({ a: [1, 2] })
    expect(readdirSync(folder)).toEqual(['evening.json'])
  })

  it('answers null for a missing or damaged file', () => {
    const store = fileStore(folder)
    expect(store.load('evening')).toBeNull()
    writeFileSync(join(folder, 'evening.json'), '{"half":')
    expect(store.load('evening')).toBeNull()
  })

  it('removes a document, and does not mind when it is not there', () => {
    const store = fileStore(join(folder, 'new', 'folder'))
    store.save('evening', 1)
    store.remove('evening')
    store.remove('evening')
    expect(store.load('evening')).toBeNull()
  })
})
