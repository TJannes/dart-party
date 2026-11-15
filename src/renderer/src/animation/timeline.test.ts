import { describe, expect, it } from 'vitest'
import type { Beat, Cue, DartStory } from '../../../core/evening/cues'
import { manualDart } from '../../../core/board/ring'
import { MAX_CHAIN, timelineOf } from './timeline'

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

  it('makes a turn change a single short step', () => {
    const timeline = timelineOf({ kind: 'turn', game: 'g0', player: 'bob' }, false)
    expect(timeline.steps).toHaveLength(1)
    expect(timeline.sounds).toEqual([{ at: 0, effect: 'turn' }])
  })
})
