import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BoardEvent } from './events'
import { BoardTracker, type BoardSnapshot } from './tracker'

const dart = (segmentName: string, segmentNumber: number, multiplier: number) => ({
  bed: multiplier === 3 ? 'Triple' : multiplier === 2 ? 'Double' : 'SingleOuter',
  bouncer: false,
  coordsX: 0.1,
  coordsY: 0.2,
  failed: false,
  method: 'UnanimousCam',
  multiplier,
  segmentName,
  segmentNumber,
})

const state = (event: string, status: string, throws: unknown[] = [], extra = {}) => ({
  connected: true,
  running: true,
  event,
  status,
  throws,
  ...extra,
})

const idle = state('takeoutFinished', 'throw')
const stuck = state('takeoutStarted', 'takeoutInProgress')

function setup() {
  const events: BoardEvent[] = []
  const snapshots: BoardSnapshot[] = []
  const resetBoard = vi.fn()
  const tracker = new BoardTracker({
    onEvent: (event) => events.push(event),
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    resetBoard,
  })
  const types = () => events.map((e) => e.type)
  return { tracker, events, snapshots, resetBoard, types }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('darts', () => {
  it('does not throw again the darts that were in the board at startup', () => {
    const { tracker, types } = setup()
    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    expect(types()).toEqual([])
    expect(tracker.snapshot.throws).toHaveLength(1)
  })

  it('reports a dart edited inside Autodarts as a correction', () => {
    const { tracker, events } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    tracker.receiveState(state('throwDetected', 'throw', [dart('T20', 20, 3)]))
    expect(events.at(-1)).toMatchObject({
      type: 'throwsCorrected',
      throws: [{ name: 'T20', multiplier: 3 }],
    })
  })

  it('reports two darts that arrive in one state', () => {
    const { tracker, events } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(state('throwDetected', 'throw', [dart('S1', 1, 1), dart('S2', 2, 1)]))
    expect(events).toMatchObject([
      { type: 'dartThrown', index: 0 },
      { type: 'dartThrown', index: 1 },
    ])
  })

  it('takes bull as number 25 and anything else outside 1-20 as a miss', () => {
    const { tracker, events } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(
      state('throwDetected', 'throw', [dart('Bull', 25, 2), dart('S99', 99, 1), dart('S0', 0, 1)]),
    )
    expect(events).toMatchObject([
      { dart: { number: 25, multiplier: 2, miss: false } },
      { dart: { number: null, multiplier: 0, miss: true } },
      { dart: { number: null, multiplier: 0, miss: true } },
    ])
  })

  it('takes a bounce-out as a miss', () => {
    const { tracker, events } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(
      state('throwDetected', 'throw', [{ ...dart('S20', 20, 1), bouncer: true }]),
    )
    expect(events).toMatchObject([{ dart: { miss: true, number: null } }])
  })

  it('ignores a repeated state', () => {
    const { tracker, events, snapshots } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(idle)
    tracker.receiveMessage({ type: 'state', data: idle })
    expect(events).toEqual([])
    expect(snapshots).toHaveLength(1)
  })
})

describe('stuck board', () => {
  it('resets after two seconds', () => {
    const { tracker, resetBoard, types } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(stuck)
    expect(types()).toEqual(['boardStuck'])
    vi.advanceTimersByTime(1999)
    expect(resetBoard).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(resetBoard).toHaveBeenCalledTimes(1)
  })

  it('does not reset when the board recovers by itself', () => {
    const { tracker, resetBoard } = setup()
    tracker.receiveState(stuck)
    vi.advanceTimersByTime(1000)
    tracker.receiveState(idle)
    vi.advanceTimersByTime(10_000)
    expect(resetBoard).not.toHaveBeenCalled()
  })

  it('does not reset once the connection is gone', () => {
    const { tracker, resetBoard } = setup()
    tracker.receiveState(stuck)
    tracker.linkDown()
    vi.advanceTimersByTime(10_000)
    expect(resetBoard).not.toHaveBeenCalled()
  })

  it('keeps trying while the board stays stuck, and stops when it is not', () => {
    const { tracker, resetBoard, types } = setup()
    tracker.receiveState(stuck)
    vi.advanceTimersByTime(6000)
    expect(resetBoard).toHaveBeenCalledTimes(3)
    tracker.receiveState(state('manualReset', 'throw'))
    vi.advanceTimersByTime(6000)
    expect(resetBoard).toHaveBeenCalledTimes(3)
    expect(types()).toEqual(['boardStuck', 'boardReset'])
  })

  it('does not take a takeout with darts in the board for stuck', () => {
    const { tracker, resetBoard, types } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    tracker.receiveState(state('takeoutStarted', 'takeoutInProgress', [dart('S20', 20, 1)]))
    vi.advanceTimersByTime(10_000)
    expect(types()).toEqual(['dartThrown'])
    expect(resetBoard).not.toHaveBeenCalled()
  })
})

describe('detection', () => {
  it('reports detection stopping and starting', () => {
    const { tracker, types } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(state('stopped', 'stopped', [], { running: false }))
    tracker.receiveState(state('started', 'throw'))
    expect(types()).toEqual(['detectionStopped', 'detectionStarted'])
  })
})

describe('connection', () => {
  it('starts out connecting and says nothing when Autodarts is not there', () => {
    const { tracker, types } = setup()
    expect(tracker.snapshot.link).toBe('connecting')
    tracker.linkDown()
    tracker.linkDown()
    expect(types()).toEqual([])
    expect(tracker.snapshot.link).toBe('offline')
  })

  it('reports the connection lost once and restored once', () => {
    const { tracker, types } = setup()
    tracker.receiveState(idle)
    tracker.linkDown()
    tracker.linkDown()
    tracker.receiveState(idle)
    expect(types()).toEqual(['connectionLost', 'connectionRestored'])
  })

  it('reports darts thrown while the connection was down', () => {
    const { tracker, types } = setup()
    tracker.receiveState(idle)
    tracker.linkDown()
    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    expect(types()).toEqual(['connectionLost', 'connectionRestored', 'dartThrown'])
  })

  it('reports an unexpected shape once and keeps the last good state', () => {
    const { tracker, events } = setup()
    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    tracker.receiveState({ hello: 'world' })
    tracker.receiveState('<html>')
    tracker.receiveState(state('throwDetected', 'throw', ['S20']))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'unexpectedData' })
    expect(tracker.snapshot).toMatchObject({ link: 'unexpected', throws: [{ name: 'S20' }] })

    tracker.receiveState(state('throwDetected', 'throw', [dart('S20', 20, 1)]))
    expect(tracker.snapshot.link).toBe('online')
  })

  it('counts a dart without a number or ring as a miss, not as an error', () => {
    const { tracker, events } = setup()
    tracker.receiveState(idle)
    tracker.receiveState(state('throwDetected', 'throw', [{ bed: 'Outside', coordsX: 1.3, coordsY: 0.2 }]))
    expect(tracker.snapshot.link).toBe('online')
    expect(events).toMatchObject([
      { type: 'dartThrown', index: 0, dart: { name: 'Miss', miss: true, number: null, position: { x: 1.3, y: 0.2 } } },
    ])
  })

  it('ignores messages that are not a state', () => {
    const { tracker, types } = setup()
    tracker.receiveState(idle)
    tracker.receiveMessage({ type: 'somethingNew', data: 42 })
    expect(types()).toEqual([])
    expect(tracker.snapshot.link).toBe('online')
  })
})
