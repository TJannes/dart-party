import { describe, expect, it } from 'vitest'
import { drawableGames } from '../game/registry'
import { strings } from '../../shared/strings'
import { cueBetween } from './cues'
import { rulesDemo } from './demo'
import { activeState, type GameRecord, type Player } from './party'

const players: Player[] = ['ann', 'bob', 'cy'].map((id) => ({ id, name: id, avatar: 'fox' }))
const order = ['cy', 'ann', 'bob']

const race: GameRecord = {
  gameId: 'race',
  order,
  setup: { segments: { ann: [20, 1], bob: [18, 4], cy: [13, 6] } },
  turns: [{ darts: [], done: false }],
}

describe('the demo on the rules card', () => {
  it('has none for a game without a script', () => {
    expect(rulesDemo({ ...race, gameId: 'decider' }, players)).toBeNull()
  })

  it('plays Race with the dealt segments, in the throwing order', () => {
    const steps = rulesDemo(race, players)!
    const positions = steps.map((step) => activeState(step.after)!.view.positions)
    expect(positions).toEqual([
      { ann: 0, bob: 0, cy: 1 },
      { ann: 0, bob: 0, cy: 4 },
      { ann: 0, bob: 0, cy: 3 },
    ])
    expect(steps[2]!.after.games[0]!.turns.length).toBe(2)
    // The real game is left alone.
    expect(race.turns).toEqual([{ darts: [], done: false }])
  })

  const duel: GameRecord = { ...race, gameId: 'lastOneStanding', setup: { segments: { ann: [20], bob: [18], cy: [13] } } }
  const records: Record<string, GameRecord> = { race, lastOneStanding: duel }
  const demoOf = (gameId: string, order = race.order) =>
    rulesDemo({ ...(records[gameId] ?? { ...race, gameId, setup: null }), order }, players)!
  /** What each step's dart caused, as the kinds of its chain. */
  const told = (gameId: string, order?: string[]): string[] =>
    demoOf(gameId, order).map((step) => {
      const cue = cueBetween(step.before, step.after)
      return cue?.kind === 'dart' ? cue.story.chain.map((beat) => beat.kind).join(' ') : 'no dart'
    })

  it('gives every game a demo with a caption per step, each a dart to animate', () => {
    const texts = strings.games as Record<string, { demo?: readonly string[] }>
    for (const { id } of drawableGames) {
      for (const order of [race.order, race.order.slice(0, 2)]) {
        const steps = demoOf(id, order)
        expect(steps.length, id).toBe(texts[id]!.demo!.length)
        expect(steps.length, id).toBeGreaterThanOrEqual(2)
        expect(steps.length, id).toBeLessThanOrEqual(4)
        for (const step of steps) expect(cueBetween(step.before, step.after)?.kind, id).toBe('dart')
      }
    }
  })

  it('shows what the captions say', () => {
    const out: Record<string, string[]> = {}
    for (const { id } of drawableGames) out[id] = told(id)
    expect(out).toMatchInlineSnapshot(`
      {
        "higherOrLower": [
          "",
          "call",
          "call lifeLost",
        ],
        "landGrab": [
          "scored",
          "fortified",
          "attacked",
          "scored lost attacked",
        ],
        "lastOneStanding": [
          "attacked lifeLost",
          "attacked lifeLost",
          "attacked lifeLost knockedOut finalDuel",
        ],
        "minefield": [
          "dug scored",
          "dug scored",
          "dug lost exploded",
        ],
        "piggyBank": [
          "scored",
          "scored",
          "lost",
        ],
        "race": [
          "scored",
          "scored",
          "attacked",
        ],
        "raiseTheBar": [
          "",
          "jump",
          "scored jump",
        ],
        "robinHood": [
          "scored spectacle",
          "scored",
          "scored",
        ],
        "sniper": [
          "measured",
          "measured",
          "measured roundResult",
        ],
        "spotlight": [
          "scored",
          "scored",
          "",
        ],
        "timeBomb": [
          "fuse",
          "passed",
          "exploded lifeLost",
        ],
      }
    `)
  })
})
