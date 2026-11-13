import { describe, expect, it } from 'vitest'
import { seededRandom } from '../random'
import { activeState, type Evening, type Player } from './evening'
import { EveningSession, type Store } from './session'

const players: Player[] = ['ann', 'bob'].map((name) => ({ id: name, name, avatar: 'fox' }))

function memoryStore(initial: Record<string, unknown> = {}) {
  const files = new Map<string, string>(
    Object.entries(initial).map(([name, data]) => [name, JSON.stringify(data)]),
  )
  let saves = 0
  const store: Store = {
    load: (name) => (files.has(name) ? JSON.parse(files.get(name)!) : null),
    save: (name, data) => {
      saves++
      files.set(name, JSON.stringify(data))
    },
    remove: (name) => void files.delete(name),
  }
  return { store, files, saves: () => saves }
}

function session(store: Store) {
  const changes: (Evening | null)[] = []
  const s = new EveningSession(store, seededRandom(5), (e) => changes.push(e), () => new Date(0))
  return { s, changes }
}

/** Starts a one-game evening and gets to the first dart. */
function playing(store: Store) {
  const { s, changes } = session(store)
  s.command({ type: 'start', players, games: 1 })
  s.command({ type: 'advance' })
  s.command({ type: 'advance' })
  return { s, changes }
}

/** Throws the current player's own triple until the Race is won. */
function winRace(s: EveningSession) {
  for (let guard = 0; guard < 50 && !activeState(s.current!)!.finished; guard++) {
    const state = activeState(s.current!)!
    const [segment] = state.view.segments[state.current!.player]
    s.command({ type: 'addDart', dart: { number: segment, multiplier: 3 } })
    if (activeState(s.current!)!.current?.dartsLeft === 0) s.command({ type: 'nextPlayer' })
  }
}

describe('EveningSession', () => {
  it('starts with no evening and ignores commands until one starts', () => {
    const { s, changes } = session(memoryStore().store)
    s.command({ type: 'advance' })
    s.command({ type: 'addDart', dart: { miss: true } })
    s.boardEvent({ type: 'dartsRemoved' })
    expect(s.current).toBeNull()
    expect(changes).toEqual([])
  })

  it('refuses an evening that is not valid', () => {
    const { s } = session(memoryStore().store)
    s.command({ type: 'start', players: players.slice(0, 1), games: 5 })
    expect(s.current).toBeNull()
  })

  it('does not swap players once an evening runs', () => {
    const { s } = playing(memoryStore().store)
    const before = s.current
    s.command({ type: 'start', players: [...players].reverse(), games: 3 })
    expect(s.current).toBe(before)
  })

  it('saves after every dart and resumes after a restart', () => {
    const memory = memoryStore()
    const { s } = playing(memory.store)
    const saved = memory.saves()
    s.boardEvent({
      type: 'dartThrown',
      index: 0,
      dart: { name: 'S20', number: 20, multiplier: 1, bed: 'SingleOuter', miss: false, position: null },
    })
    s.command({ type: 'addDart', dart: { miss: true } })
    expect(memory.saves()).toBe(saved + 2)

    const { s: restarted } = session(memory.store)
    expect(restarted.current).toEqual(s.current)
    expect(restarted.current!.games[0]!.turns[0]!.darts.map((d) => d.by)).toEqual(['board', 'hand'])
  })

  it('does not save or announce when nothing changed', () => {
    const memory = memoryStore()
    const { s, changes } = playing(memory.store)
    const [saves, announced] = [memory.saves(), changes.length]
    s.boardEvent({ type: 'boardReset' })
    s.boardEvent({ type: 'dartsRemoved' })
    s.command({ type: 'removeLastDart' })
    expect([memory.saves(), changes.length]).toEqual([saves, announced])
  })

  it('ignores a dart that does not exist', () => {
    const { s } = playing(memoryStore().store)
    const before = s.current
    s.command({ type: 'addDart', dart: { number: 21, multiplier: 1 } })
    s.command({ type: 'addDart', dart: { number: 25, multiplier: 3 } })
    expect(s.current).toBe(before)
  })

  it('starts fresh when the saved evening cannot be read', () => {
    for (const broken of [
      'nonsense',
      { format: 99, evening: {} },
      { format: 1, evening: { players, games: [{ gameId: 'gone', order: [], setup: null, turns: [] }], deciders: [] } },
    ]) {
      expect(session(memoryStore({ evening: broken }).store).s.current).toBeNull()
    }
  })

  it('forgets an aborted evening and keeps no result of it', () => {
    const memory = memoryStore()
    const { s } = playing(memory.store)
    s.command({ type: 'abort' })
    expect(s.current).toBeNull()
    expect(memory.files.has('evening')).toBe(false)
    expect(s.history).toEqual([])
  })

  it('writes the result to the history when the podium is left', () => {
    const memory = memoryStore()
    const { s } = playing(memory.store)
    s.command({ type: 'finish' }) // Not on the podium yet.
    expect(s.current).not.toBeNull()

    winRace(s)
    s.command({ type: 'advance' })
    expect(s.current!.stage).toBe('podium')
    const winner = s.current!.games[0]!.order[0]!
    s.command({ type: 'finish' })

    expect(s.current).toBeNull()
    expect(memory.files.has('evening')).toBe(false)
    expect(s.history).toHaveLength(1)
    expect(s.history[0]).toMatchObject({
      finishedAt: '1970-01-01T00:00:00.000Z',
      ranking: [[winner], [players.find((p) => p.id !== winner)!.id]],
      points: { [winner]: 2 },
      games: ['race'],
    })
  })
})
