import type { BoardEvent } from '../core/board/events'
import type { Dart } from '../core/board/state'
import type { BoardSnapshot } from '../core/board/tracker'
import { strings } from './strings'

const s = strings.board

export interface BoardView {
  message: string
  /** 'ok' when darts will be detected, 'problem' when they will not. */
  tone: 'ok' | 'busy' | 'problem'
  /** A reset only makes sense when Autodarts can hear it. */
  canReset: boolean
}

export function boardView(snapshot: BoardSnapshot): BoardView {
  if (snapshot.link === 'offline') return { message: s.offline, tone: 'problem', canReset: false }
  if (snapshot.link === 'unexpected') {
    return { message: s.unexpected, tone: 'problem', canReset: false }
  }
  switch (snapshot.condition) {
    case null:
      return { message: s.connecting, tone: 'busy', canReset: false }
    case 'ready':
      return { message: s.ready, tone: 'ok', canReset: true }
    case 'starting':
      return { message: s.starting, tone: 'busy', canReset: true }
    case 'stuck':
      return { message: s.stuck, tone: 'problem', canReset: true }
    case 'stopped':
      return { message: s.stopped, tone: 'problem', canReset: false }
  }
}

export function dartLabel(dart: Dart): string {
  return dart.miss ? s.miss : dart.name
}

export function eventLabel(event: BoardEvent): string {
  return event.type === 'dartThrown' ? s.log.dartThrown(dartLabel(event.dart)) : s.log[event.type]
}
