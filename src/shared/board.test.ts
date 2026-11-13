import { describe, expect, it } from 'vitest'
import type { BoardSnapshot } from '../core/board/tracker'
import { boardView, dartLabel, eventLabel } from './board'
import { strings } from './strings'

const snapshot = (over: Partial<BoardSnapshot>): BoardSnapshot => ({
  link: 'online',
  condition: 'ready',
  cloudConnected: true,
  throws: [],
  ...over,
})

describe('boardView', () => {
  it('says that Autodarts is not running, whatever the last state was', () => {
    expect(boardView(snapshot({ link: 'offline', condition: 'ready' }))).toMatchObject({
      message: strings.board.offline,
      tone: 'problem',
      canReset: false,
    })
  })

  it('says when Autodarts answers in an unexpected shape', () => {
    expect(boardView(snapshot({ link: 'unexpected' })).message).toBe(strings.board.unexpected)
  })

  it('is only happy when darts will be detected', () => {
    expect(boardView(snapshot({})).tone).toBe('ok')
    for (const condition of ['starting', 'stuck', 'stopped'] as const) {
      expect(boardView(snapshot({ condition })).tone).not.toBe('ok')
    }
    expect(boardView(snapshot({ link: 'connecting', condition: null })).tone).toBe('busy')
  })
})

describe('labels', () => {
  const miss = { name: 'M6', number: null, multiplier: 0, bed: 'Outside', miss: true, position: null } as const

  it('calls every kind of miss a miss', () => {
    expect(dartLabel(miss)).toBe('Miss')
    expect(eventLabel({ type: 'dartThrown', dart: miss, index: 0 })).toBe('Dart: Miss')
  })

  it('has a line for every event', () => {
    expect(eventLabel({ type: 'dartsRemoved' })).toBe(strings.board.log.dartsRemoved)
    expect(eventLabel({ type: 'unexpectedData', message: 'x' })).toBe(
      strings.board.log.unexpectedData,
    )
  })
})
