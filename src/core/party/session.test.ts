import { describe, expect, it } from 'vitest'
import { seededRandom } from '../random'
import { drinkTally, drinkingNow } from './drinking'
import { activeState, type Party, type Player } from './party'
import { PartySession, type Store } from './session'

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
  const changes: (Party | null)[] = []
  const s = new PartySession(store, seededRandom(5), (e) => changes.push(e), () => new Date(0), () => ['race'])
  return { s, changes }
}

/** Starts a one-game party and gets to the first dart. */
function playing(store: Store) {
  const { s, changes } = session(store)
  s.command({ type: 'start', players, games: 1 })
  s.command({ type: 'advance' })
  s.command({ type: 'advance' })
  return { s, changes }
}

/** Throws the current player's own triple until the Race is won. */
function winRace(s: PartySession) {
  for (let guard = 0; guard < 50 && !activeState(s.current!)!.finished; guard++) {
    const state = activeState(s.current!)!
    const [segment] = state.view.segments[state.current!.player]
    s.command({ type: 'addDart', dart: { number: segment, multiplier: 3 } })
    if (activeState(s.current!)!.current?.dartsLeft === 0) s.command({ type: 'nextPlayer' })
  }
}

describe('PartySession', () => {
  it('starts with no party and ignores commands until one starts', () => {
    const { s, changes } = session(memoryStore().store)
    s.command({ type: 'advance' })
    s.command({ type: 'addDart', dart: { miss: true } })
    s.boardEvent({ type: 'dartsRemoved' })
    expect(s.current).toBeNull()
    expect(changes).toEqual([])
  })

  it('refuses a party that is not valid', () => {
    const { s } = session(memoryStore().store)
    s.command({ type: 'start', players: players.slice(0, 1), games: 5 })
    expect(s.current).toBeNull()
  })

  it('does not swap players once a party runs', () => {
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

  it('resumes a party saved by a version that called it an evening, and moves it', () => {
    const first = memoryStore()
    playing(first.store).s.command({ type: 'addDart', dart: { number: 20, multiplier: 1 } })
    const saved = JSON.parse(first.files.get('party')!)
    const old = memoryStore({ evening: { format: saved.format, evening: saved.party } })
    const { s } = session(old.store)
    expect(s.current).toEqual(saved.party)
    expect(JSON.parse(old.files.get('party')!)).toEqual(saved)
    expect(old.files.has('evening')).toBe(false)
  })

  it('starts fresh when the saved party cannot be read', () => {
    for (const broken of [
      'nonsense',
      { format: 99, party: {} },
      { format: 1, party: { players, games: [{ gameId: 'gone', order: [], setup: null, turns: [] }], deciders: [] } },
    ]) {
      expect(session(memoryStore({ party: broken }).store).s.current).toBeNull()
    }
  })

  it('forgets an aborted party and keeps no result of it', () => {
    const memory = memoryStore()
    const { s } = playing(memory.store)
    s.command({ type: 'abort' })
    expect(s.current).toBeNull()
    expect(memory.files.has('party')).toBe(false)
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
    expect(memory.files.has('party')).toBe(false)
    expect(s.history).toHaveLength(1)
    expect(s.history[0]).toMatchObject({
      finishedAt: '1970-01-01T00:00:00.000Z',
      ranking: [[winner], [players.find((p) => p.id !== winner)!.id]],
      points: { [winner]: 2 },
      games: ['race'],
    })
  })

  it('reports the start of a game, and nothing else', () => {
    let starts = 0
    const s = new PartySession(memoryStore().store, seededRandom(5), () => {}, () => new Date(0), () => ['race'], () => starts++)
    s.command({ type: 'start', players, games: 1 })
    s.command({ type: 'advance' }) // The rules card.
    expect(starts).toBe(0)
    s.command({ type: 'advance' }) // Start.
    expect(starts).toBe(1)

    s.command({ type: 'addDart', dart: { miss: true } })
    s.command({ type: 'removeLastDart' })
    s.command({ type: 'nextPlayer' })
    s.command({ type: 'advance' }) // Mid-game: does nothing.
    expect(starts).toBe(1)

    winRace(s)
    s.command({ type: 'advance' }) // The podium.
    expect(starts).toBe(1)
  })

  it('reports the start of a free-play game and of playing it again', () => {
    let starts = 0
    const s = new PartySession(memoryStore().store, seededRandom(5), () => {}, () => new Date(0), () => ['race'], () => starts++)
    s.command({ type: 'startFreePlay', players, game: 'aroundTheClock' })
    expect(starts).toBe(1)
    s.command({ type: 'playAgain' })
    expect(starts).toBe(2)
  })

  describe('as a drinking game', () => {
    const three: Player[] = ['ann', 'bob', 'cy'].map((name) => ({ id: name, name, avatar: 'fox' }))
    function drinking(store: Store, games = 2) {
      const s = new PartySession(store, seededRandom(5), () => {}, () => new Date(0), () => ['race'], () => {}, () => [
        'threeMisses',
        'afterGame',
        'podium',
      ])
      s.command({ type: 'start', players: three, games, drinking: { sitOut: ['cy', 'nobody'] } })
      return s
    }
    const miss = { type: 'addDart', dart: { miss: true } } as const

    it('starts on the rules card with the rules of the settings and who sits out', () => {
      const s = drinking(memoryStore().store)
      expect(s.current!.stage).toBe('drinkRules')
      expect(s.current!.drinking).toMatchObject({ rules: ['threeMisses', 'afterGame', 'podium'], sitOut: ['cy'] })
      s.command({ type: 'advance' })
      expect(s.current!.stage).toBe('draw')
    })

    it('is an ordinary party without the word', () => {
      const { s } = session(memoryStore().store)
      s.command({ type: 'start', players, games: 1 })
      expect(s.current!.stage).toBe('draw')
      expect(s.current!.drinking).toBeUndefined()
    })

    it('lets a player sit out and the mode be switched off during the party', () => {
      const s = drinking(memoryStore().store)
      for (let i = 0; i < 3; i++) s.command({ type: 'advance' })
      const first = activeState(s.current!)!.current!.player
      s.command({ type: 'setSitOut', player: first, out: true })
      for (let i = 0; i < 3; i++) s.command(miss)
      expect(drinkTally(s.current!)[first]!.drunk).toBe(0)
      s.command({ type: 'setDrinking', on: false })
      expect(drinkingNow(s.current!).on).toBe(false)
    })

    it('spins the wheel between games, keeps the outcome over a restart, and saves the sips', () => {
      const { store } = memoryStore()
      const s = drinking(store, 2)
      for (let i = 0; i < 3; i++) s.command({ type: 'advance' })
      winRace(s)
      s.command({ type: 'advance' })
      expect(s.current!.stage).toBe('wheel')
      s.command({ type: 'spinWheel' })
      const wheel = s.current!.drinking!.wheels[0]!
      expect(['ann', 'bob']).toContain(wheel.player)

      const resumed = drinking(store)
      expect(resumed.current!.stage).toBe('wheel')
      expect(resumed.current!.drinking!.wheels[0]).toEqual(wheel)
      resumed.command({ type: 'spinWheel' })
      expect(resumed.current!.drinking!.wheels[0]).toEqual(wheel)

      for (let i = 0; i < 3; i++) resumed.command({ type: 'advance' })
      winRace(resumed)
      resumed.command({ type: 'advance' })
      // A tie at the top is played off first.
      for (let guard = 0; guard < 20 && resumed.current!.stage === 'decider'; guard++) {
        resumed.command({ type: 'addDart', dart: { number: 20, multiplier: guard % 3 === 0 ? 3 : 1 } })
        resumed.command({ type: 'nextPlayer' })
        resumed.command({ type: 'advance' })
      }
      expect(resumed.current!.stage).toBe('podium')
      const tally = drinkTally(resumed.current!)
      resumed.command({ type: 'finish' })
      expect(resumed.history.at(-1)!.drinks).toEqual(tally)
      expect(tally['cy']!.drunk).toBe(0)
    })
  })
})
