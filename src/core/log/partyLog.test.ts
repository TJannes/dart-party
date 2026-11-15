import { describe, expect, it } from 'vitest'
import { PartyLog, type LogFiles } from './partyLog'

function memoryFiles(): LogFiles & { files: Map<string, string> } {
  const files = new Map<string, string>()
  return {
    files,
    list: () => [...files.keys()],
    read: (name) => files.get(name) ?? null,
    write: (name, text) => void files.set(name, text),
    append: (name, text) => void files.set(name, (files.get(name) ?? '') + text),
    remove: (name) => void files.delete(name),
  }
}

/** A clock that moves on a second at every reading. */
function clock(start = Date.UTC(2026, 10, 15, 20, 0, 0)) {
  let ms = start
  return () => new Date((ms += 1000))
}

const start = { players: ['Ann', 'Bob'], freePlay: false, appVersion: '0.7.0' }

function lines(files: Map<string, string>, id: string) {
  return files
    .get(`${id}.jsonl`)!
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
}

describe('PartyLog', () => {
  it('writes nothing while no party is on', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock())
    log.record('board', { type: 'dartsRemoved' })
    log.autodarts('poll', { throws: [] })
    expect(log.flag({})).toBeNull()
    expect(memory.files.size).toBe(0)
  })

  it('keeps a party in one file, with times, and a repeated poll once', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock())
    log.begin(start)
    const id = log.current!
    log.autodarts('socket', { throws: [1] })
    log.autodarts('poll', { throws: [1] })
    log.autodarts('poll', { throws: [] })
    log.party({ stage: 'playing' })
    log.party({ stage: 'playing' })
    log.record('command', { type: 'nextPlayer' })
    log.end()
    log.record('board', { type: 'dartsRemoved' })

    expect(lines(memory.files, id).map((l) => l.kind)).toEqual([
      'start',
      'autodarts',
      'autodarts',
      'party',
      'command',
      'end',
    ])
    expect(lines(memory.files, id)[0]).toMatchObject({ t: '2026-11-15T20:00:02.000Z', data: start })
    expect(log.current).toBeNull()
  })

  it('carries on the same log after a restart, until the party ends', () => {
    const memory = memoryFiles()
    const first = new PartyLog(memory, clock())
    first.begin(start)
    const id = first.current

    const again = new PartyLog(memory, clock())
    expect(again.current).toBe(id)
    again.end()
    expect(new PartyLog(memory, clock()).current).toBeNull()
  })

  it('marks a bug with what the app knew, and takes a note later', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock())
    log.begin(start)
    const marked = log.flag({ party: 'state' })!
    const second = log.flag({ party: 'later' })!
    expect(second.flag.id).toBe(2)
    log.end()

    log.note(marked.log, marked.flag.id, 'Darts vanished after the takeout')
    log.note(marked.log, 99, 'no such flag')
    const [summary] = log.list()
    expect(summary).toMatchObject({ id: marked.log, players: ['Ann', 'Bob'], freePlay: false })
    expect(summary!.flags.map((f) => f.note)).toEqual(['Darts vanished after the takeout', ''])
    expect(summary!.flags[0]!.context).toEqual({ party: 'state' })
  })

  it('bundles one log with its bugs into one file', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock())
    log.begin(start)
    log.flag({})
    const id = log.current!
    const bundle = JSON.parse(log.bundle(id)!)
    expect(bundle.log).toBe(id)
    expect(bundle.flags).toHaveLength(1)
    expect(bundle.entries.map((e: { kind: string }) => e.kind)).toEqual(['start', 'flag'])
    expect(log.bundle('gone')).toBeNull()
  })

  it('keeps only the newest logs, but never one with a bug', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock(), 3)
    log.begin(start)
    log.flag({})
    const flagged = log.current
    log.end()
    for (let n = 0; n < 5; n++) {
      log.begin(start)
      log.end()
    }
    const kept = log.list()
    expect(kept).toHaveLength(3)
    expect(kept.map((l) => l.id)).toContain(flagged)
  })

  it('deletes a log with its bugs, but not the one being written', () => {
    const memory = memoryFiles()
    const log = new PartyLog(memory, clock())
    log.begin(start)
    log.flag({})
    const old = log.current!
    log.end()
    log.begin(start)
    expect(log.delete(log.current!)).toBe(false)
    expect(log.delete(old)).toBe(true)
    expect(log.delete(old)).toBe(false)
    expect(log.list().map((l) => l.id)).toEqual([log.current])
    expect([...memory.files.keys()].some((name) => name.startsWith(old))).toBe(false)
  })

  it('never lets a broken disk stop the party', () => {
    const broken: LogFiles = {
      list: () => {
        throw new Error('disk')
      },
      read: () => {
        throw new Error('disk')
      },
      write: () => {
        throw new Error('disk')
      },
      append: () => {
        throw new Error('disk')
      },
      remove: () => {
        throw new Error('disk')
      },
    }
    const log = new PartyLog(broken, clock())
    expect(() => {
      log.begin(start)
      log.record('board', {})
      log.flag({})
      log.end()
      log.list()
    }).not.toThrow()
  })

  it('gives two parties in the same second their own log', () => {
    const memory = memoryFiles()
    const still = () => new Date(Date.UTC(2026, 10, 15, 20, 0, 0))
    const log = new PartyLog(memory, still)
    log.begin(start)
    const first = log.current
    log.end()
    log.begin(start)
    expect(log.current).not.toBe(first)
    expect(log.list()).toHaveLength(2)
  })
})
