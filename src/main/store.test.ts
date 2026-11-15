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
    fileStore(folder).save('party', { a: [1, 2] })
    expect(fileStore(folder).load('party')).toEqual({ a: [1, 2] })
    expect(readdirSync(folder)).toEqual(['party.json'])
  })

  it('answers null for a missing or damaged file', () => {
    const store = fileStore(folder)
    expect(store.load('party')).toBeNull()
    writeFileSync(join(folder, 'party.json'), '{"half":')
    expect(store.load('party')).toBeNull()
  })

  it('removes a document, and does not mind when it is not there', () => {
    const store = fileStore(join(folder, 'new', 'folder'))
    store.save('party', 1)
    store.remove('party')
    store.remove('party')
    expect(store.load('party')).toBeNull()
  })
})
