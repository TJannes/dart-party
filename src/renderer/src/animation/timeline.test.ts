import { describe, expect, it } from 'vitest'
import type { Beat, Cue, DartStory } from '../../../core/party/cues'
import { manualDart } from '../../../core/board/ring'
import { blowTimes, DIG_TIME, DRINK_CENTRE, MAX_CHAIN, STONE_FLIGHT, timelineOf } from './timeline'

const story = (feedback: DartStory['feedback'], chain: Beat[]): DartStory => ({
  game: 'g0',
  gameId: 'lastOneStanding',
  turn: 0,
  index: 0,
  thrower: 'ann',
  dart: manualDart(20, 1),
  feedback,
  chain,
})
const dart = (feedback: DartStory['feedback'], chain: Beat[], next: string | null = null): Cue => ({
  kind: 'dart',
  story: story(feedback, chain),
  next,
})

const knockout: Beat[] = [
  { kind: 'attacked', by: 'ann', victim: 'bob', amount: 3 },
  { kind: 'lifeLost', player: 'bob', amount: 3, left: 0 },
  { kind: 'knockedOut', player: 'bob' },
  { kind: 'won', players: ['ann'] },
]

describe('the timeline of a cue', () => {
  it('plays a chain one step after the other', () => {
    const { steps } = timelineOf(dart('great', knockout), false)
    const chained = steps.filter((step) => ['attacked', 'lifeLost', 'knockedOut', 'won'].includes(step.scene.kind))
    expect(chained.map((step) => step.scene.kind)).toEqual(['attacked', 'lifeLost', 'knockedOut', 'won'])
    chained.slice(1).forEach((step, n) => {
      expect(step.at).toBeCloseTo(chained[n]!.at + chained[n]!.length)
    })
  })

  it('never lets a chain run past its limit', () => {
    const long: Beat[] = [...knockout.slice(0, 3), ...knockout.slice(0, 3), ...knockout]
    const { steps } = timelineOf(dart('great', long), false)
    const end = Math.max(...steps.filter((step) => step.scene.kind !== 'turn').map((step) => step.at + step.length))
    expect(end).toBeLessThanOrEqual(MAX_CHAIN + 0.001)
  })

  it('changes a Land Grab plot hands only when the catapult stone lands', () => {
    const capture: Cue = {
      kind: 'dart',
      story: {
        ...story('great', [
          { kind: 'attacked', by: 'ann', victim: 'bob', amount: 1 },
          { kind: 'lost', player: 'bob', amount: 1 },
          { kind: 'scored', player: 'ann', amount: 1 },
        ]),
        gameId: 'landGrab',
      },
      next: null,
    }
    const { steps, sounds } = timelineOf(capture, false)
    const attack = steps.find((step) => step.scene.kind === 'attacked')!
    const landing = attack.at + attack.length * STONE_FLIGHT
    expect(attack.length * STONE_FLIGHT).toBeGreaterThanOrEqual(0.6)
    for (const kind of ['lost', 'scored']) {
      expect(steps.find((step) => step.scene.kind === kind)!.at).toBeCloseTo(landing)
    }
    expect(sounds.find((sound) => sound.effect === 'crumble')!.at).toBeCloseTo(landing)
    expect(sounds.find((sound) => sound.effect === 'build')!.at).toBeCloseTo(landing)
  })

  it('lets points fly while the dart lands', () => {
    const { steps } = timelineOf(dart('good', [{ kind: 'scored', player: 'ann', amount: 20 }]), false)
    expect(steps.map((step) => step.scene.kind)).toEqual(['impact', 'good', 'scored'])
    expect(steps[2]!.at).toBeLessThan(0.5)
  })

  it('shows no cheer or sulk when the chain already hurts the thrower', () => {
    const { steps, moods } = timelineOf(dart('bad', [{ kind: 'lifeLost', player: 'ann', amount: 1, left: 2 }]), false)
    expect(steps.map((step) => step.scene.kind)).toEqual(['impact', 'lifeLost'])
    expect(moods).toMatchObject([{ player: 'ann', mood: 'hit' }])
  })

  it('announces the next player after the chain, but not after a win', () => {
    const passed = timelineOf(dart('bad', knockout.slice(0, 3), 'cy'), false)
    const turn = passed.steps.find((step) => step.scene.kind === 'turn')!
    const last = passed.steps.find((step) => step.scene.kind === 'knockedOut')!
    expect(turn.at).toBeGreaterThanOrEqual(last.at + last.length - 0.001)
    expect(timelineOf(dart('great', knockout, 'cy'), false).steps.some((step) => step.scene.kind === 'turn')).toBe(false)
  })

  it('keeps the sounds but drops the loud scenes when calm', () => {
    const chain: Beat[] = [{ kind: 'spectacle', what: 'threeMisses', player: 'ann' }]
    const loud = timelineOf(dart('bad', chain), false, ['ann', 'bob'])
    const calm = timelineOf(dart('bad', chain), true, ['ann', 'bob'])
    expect(loud.steps.map((step) => step.scene.kind)).toEqual(['impact', 'bad', 'spectacle'])
    expect(loud.moods).toMatchObject([{ player: 'bob', mood: 'laugh' }])
    expect(calm.steps.map((step) => step.scene.kind)).toEqual(['impact'])
    expect(calm.moods).toEqual([])
    expect(calm.sounds).toEqual(loud.sounds)
  })

  it('lands one blow per life taken in Last One Standing, each with its sound', () => {
    const { steps, sounds, moods } = timelineOf(dart('attack', knockout.slice(0, 2)), false)
    const attack = steps.find((step) => step.scene.kind === 'attacked')!
    const blows = blowTimes(attack, 3)
    expect(blows).toHaveLength(3)
    expect(blows.at(-1)!).toBeLessThan(attack.at + attack.length)
    expect(sounds.filter((sound) => sound.effect === 'punch').map((sound) => sound.at)).toEqual(blows)
    expect(moods.filter((span) => span.player === 'ann').map((span) => span.mood)).toEqual(['laugh'])
  })

  it('lets nobody laugh at hitting themselves', () => {
    const own: Beat[] = [
      { kind: 'attacked', by: 'ann', victim: 'ann', amount: 1 },
      { kind: 'lifeLost', player: 'ann', amount: 1, left: 2 },
    ]
    const { steps, moods } = timelineOf(dart('bad', own), false)
    expect(steps.map((step) => step.scene.kind)).toEqual(['impact', 'attacked', 'lifeLost'])
    expect(moods.some((span) => span.mood === 'laugh')).toBe(false)
  })

  it('starts a bang at once and ticks faster the more fuse has burned', () => {
    const bomb = (chain: Beat[]): Cue => ({ kind: 'dart', story: { ...story('bad', chain), gameId: 'timeBomb' }, next: null })
    const boom = timelineOf(bomb([{ kind: 'exploded', player: 'ann' }, { kind: 'lifeLost', player: 'ann', amount: 1, left: 2 }]), false)
    expect(boom.steps.find((step) => step.scene.kind === 'exploded')!.at).toBeLessThan(0.2)
    expect(boom.sounds.map((sound) => sound.effect)).toEqual(['miss', 'boom', 'lifeLost'])
    const tick = (burned: number) => timelineOf(bomb([{ kind: 'fuse', player: 'ann', burned }]), false).sounds.at(-1)!.effect
    expect([tick(1), tick(4), tick(8)]).toEqual(['fuseSlow', 'fuseMid', 'fuseFast'])
  })

  it('drops the final duel banner when calm', () => {
    const chain: Beat[] = [...knockout.slice(0, 3), { kind: 'finalDuel', players: ['ann', 'cy'] }]
    expect(timelineOf(dart('great', chain), false).steps.some((step) => step.scene.kind === 'finalDuel')).toBe(true)
    expect(timelineOf(dart('great', chain), true).steps.some((step) => step.scene.kind === 'finalDuel')).toBe(false)
  })

  it('gives the pig its own sounds', () => {
    const pig = (chain: Beat[]): Cue => ({ kind: 'dart', story: { ...story('good', chain), gameId: 'piggyBank' }, next: null })
    const effects = (chain: Beat[]) => timelineOf(pig(chain), false).sounds.map((sound) => sound.effect)
    expect(effects([{ kind: 'scored', player: 'ann', amount: 20 }])).toEqual(['hit', 'clink'])
    expect(effects([{ kind: 'scored', player: 'ann', amount: 60 }])).toEqual(['hit', 'goldCoin'])
    expect(effects([{ kind: 'lost', player: 'ann', amount: 30 }])).toEqual(['hit', 'smash'])
  })

  it('keeps a dig secret: nothing tells what was found before the shovel is done', () => {
    const dig = (chain: Beat[], feedback: DartStory['feedback']): Cue => ({ kind: 'dart', story: { ...story(feedback, chain), gameId: 'minefield' }, next: null })
    const chest = timelineOf(dig([{ kind: 'dug', player: 'ann', segment: 20, found: 'chest' }, { kind: 'scored', player: 'ann', amount: 5 }], 'great'), false)
    expect(chest.suspense).toBe(DIG_TIME)
    expect(chest.sounds).toContainEqual({ at: 0, effect: 'dig' })
    const telling = chest.sounds.filter((sound) => sound.effect !== 'dig')
    expect(Math.min(...telling.map((sound) => sound.at))).toBeGreaterThanOrEqual(DIG_TIME)
    const after = chest.steps.filter((step) => step.scene.kind !== 'impact' && step.scene.kind !== 'dug')
    expect(Math.min(...after.map((step) => step.at))).toBeGreaterThanOrEqual(DIG_TIME)
    expect(timelineOf(dart('good', []), false).suspense).toBe(0)
  })

  it('opens a new round with the game\'s own scene and sound', () => {
    const turn = timelineOf({ kind: 'turn', game: 'g0', gameId: 'spotlight', player: 'ann', round: 2 }, false)
    expect(turn.gameId).toBe('spotlight')
    expect(turn.steps.map((step) => step.scene.kind)).toEqual(['round', 'turn'])
    expect(turn.sounds.map((sound) => sound.effect)).toEqual(['turn', 'drumroll'])
    const last: Cue = { kind: 'dart', story: { ...story('good', []), gameId: 'sniper' }, next: 'ann', round: 2 }
    const timeline = timelineOf(last, false)
    expect(timeline.steps.at(-1)!.scene).toEqual({ kind: 'round', round: 2, player: 'ann' })
    expect(timeline.sounds.at(-1)!.effect).toBe('lock')
  })

  it('gives the drinking banner the middle of the screen after the chain and before the next player', () => {
    expect(timelineOf(dart('neutral', []), false).banner).toBeNull()

    const plain = timelineOf(dart('neutral', [], 'bob'), false, [], { orders: true })
    expect(plain.banner).toBeCloseTo(0.4)
    const up = plain.steps.find((step) => step.scene.kind === 'turn')!
    expect(up.at).toBeCloseTo(plain.banner! + DRINK_CENTRE)
    expect(plain.sounds).toContainEqual({ at: up.at, effect: 'turn' })

    // A hat-trick fills the screen first; the banner waits for it.
    const feat: Beat[] = [{ kind: 'spectacle', what: 'hatTrick', player: 'ann' }]
    const hatTrick = timelineOf(dart('good', feat), false, [], { orders: true })
    const spectacle = hatTrick.steps.find((step) => step.scene.kind === 'spectacle')!
    expect(hatTrick.banner).toBeCloseTo(spectacle.at + spectacle.length)
    expect(hatTrick.length).toBeGreaterThanOrEqual(hatTrick.banner! + DRINK_CENTRE)

    const bomb = timelineOf(dart('bad', [{ kind: 'dug', player: 'ann', segment: 20, found: 'bomb' }]), false, [], { orders: true })
    expect(bomb.banner!).toBeGreaterThan(DIG_TIME)
  })

  it('shows no drinking banner on the dart that ends the game', () => {
    const out: Beat[] = [
      { kind: 'knockedOut', player: 'bob' },
      { kind: 'won', players: ['ann'] },
    ]
    expect(timelineOf(dart('great', out), false, [], { orders: true }).banner).toBeNull()
  })

  it('lets a turn change wait for a drinking banner that is still in the middle', () => {
    const timeline = timelineOf({ kind: 'turn', game: 'g0', gameId: 'race', player: 'bob' }, false, [], { wait: 1.2 })
    expect(timeline.steps[0]!.at).toBeCloseTo(1.2)
    expect(timeline.sounds).toEqual([{ at: 1.2, effect: 'turn' }])
  })

  it('makes a turn change a single short step', () => {
    const timeline = timelineOf({ kind: 'turn', game: 'g0', gameId: 'race', player: 'bob' }, false)
    expect(timeline.steps).toHaveLength(1)
    expect(timeline.sounds).toEqual([{ at: 0, effect: 'turn' }])
  })
})
