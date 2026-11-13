import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BoardEvent } from './events'
import { BoardTracker, type BoardSnapshot } from './tracker'

// Every recording in fixtures/ is replayed through the tracker, in the order
// and with the timing it was recorded. fixtures/README.md says what was
// really thrown in each.

interface Line {
  t: number
  bron: 'events' | 'state'
  data: unknown
}

function replay(name: string) {
  const lines: Line[] = readFileSync(join(__dirname, '../../../fixtures', `${name}.jsonl`), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))

  const events: BoardEvent[] = []
  const resets: number[] = []
  let now = 0
  const tracker = new BoardTracker({
    onEvent: (event) => events.push(event),
    resetBoard: () => resets.push(now),
  })

  for (const line of lines) {
    vi.advanceTimersByTime((line.t - now) * 1000)
    now = line.t
    if (line.bron === 'events') tracker.receiveMessage(line.data)
    else tracker.receiveState(line.data)
  }
  tracker.dispose()

  /** Short form: "S12" for a dart, the event type for the rest. */
  const summary = events.map((e) => (e.type === 'dartThrown' ? e.dart.name : e.type))
  const snapshot: BoardSnapshot = tracker.snapshot
  return { events, summary, resets, snapshot }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('recordings', () => {
  it('zonder-cameras: detection never gets going', () => {
    const { summary, snapshot } = replay('zonder-cameras')
    expect(summary).toEqual([])
    expect(snapshot).toMatchObject({ link: 'online', condition: 'starting' })
  })

  it('drie-pijlen: three darts and a takeout, each dart once', () => {
    const { events, summary, resets } = replay('drie-pijlen')
    expect(summary).toEqual(['S12', 'T1', 'S18', 'dartsRemoved'])
    expect(events[1]).toMatchObject({ index: 1, dart: { number: 1, multiplier: 3, miss: false } })
    expect(resets).toEqual([])
  })

  it('een-pijl: a takeout after one dart ends the turn', () => {
    const { events, summary } = replay('een-pijl')
    expect(summary).toEqual(['S5', 'dartsRemoved'])
    expect(events[0]).toMatchObject({
      dart: { number: 5, multiplier: 1, bed: 'SingleOuter', miss: false },
    })
  })

  it('hand: a hand at an empty board gets it stuck, and it is reset', () => {
    const { summary, resets, snapshot } = replay('hand')
    expect(summary).toEqual(['boardStuck'])
    expect(snapshot.condition).toBe('stuck')
    // Nothing more was recorded, so the reset falls after the last line.
    expect(resets).toEqual([])
  })

  it('hand-herstel: starts stuck, recovers through a reset', () => {
    const { summary, resets, snapshot } = replay('hand-herstel')
    expect(summary).toEqual(['boardStuck', 'boardReset'])
    expect(snapshot.condition).toBe('ready')
    // Stuck for 95 s in the recording: we would have reset 2 s in, and kept
    // trying, because the recording does not react to our resets.
    expect(resets[0]).toBeCloseTo(0.085, 3)
    expect(resets.length).toBeGreaterThan(1)
  })

  it('reset: a reset is not a takeout, and pulling the dart afterwards sticks', () => {
    const { events, summary } = replay('reset')
    expect(summary).toEqual(['D6', 'boardReset', 'boardStuck', 'boardReset'])
    expect(events[0]).toMatchObject({ dart: { number: 6, multiplier: 2, bed: 'Double' } })
  })

  it('naast-bord: a dart in the surround is a miss with a position', () => {
    const { events, summary } = replay('naast-bord')
    expect(summary).toEqual(['M6', 'dartsRemoved'])
    const [first] = events
    if (first?.type !== 'dartThrown') throw new Error('expected a dart')
    expect(first.dart).toMatchObject({ miss: true, number: null, multiplier: 0 })
    expect(first.dart.position).not.toBeNull()
  })

  it('offline: losing the cloud changes nothing about the darts', () => {
    const { summary, snapshot, resets } = replay('offline')
    expect(summary).toEqual(['M19', 'S20', 'S10', 'dartsRemoved'])
    expect(snapshot).toMatchObject({ link: 'online', cloudConnected: true })
    expect(resets).toEqual([])
  })

  it('gestopt: standby is reported as detection stopped', () => {
    const { summary, snapshot } = replay('gestopt')
    expect(summary).toEqual(['detectionStopped'])
    expect(snapshot.condition).toBe('stopped')
  })

  it('buiten-bord: a dart off the board is a miss without a position', () => {
    const { events, summary } = replay('buiten-bord')
    expect(summary).toEqual(['Miss'])
    expect(events[0]).toMatchObject({
      dart: { miss: true, number: null, multiplier: 0, position: null },
    })
  })
})
