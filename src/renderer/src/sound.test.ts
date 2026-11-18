import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sound } from './sound'

// A stand-in for the Web Audio API that only counts the notes it is asked to play.
let notes = 0
const param = (): Record<string, unknown> => ({
  value: 1,
  setValueAtTime: () => undefined,
  linearRampToValueAtTime: () => undefined,
  exponentialRampToValueAtTime: () => undefined,
})
const node = (): Record<string, unknown> => ({ gain: param(), frequency: param(), connect: (to: unknown) => to })
class FakeContext {
  currentTime = 0
  state = 'running'
  destination = node()
  createGain = node
  createOscillator = (): Record<string, unknown> => {
    notes++
    return { ...node(), start: () => undefined, stop: () => undefined }
  }
  close = async (): Promise<void> => undefined
}

describe('music volume', () => {
  let sound: Sound
  const play = (ms: number): void => {
    // The context's clock runs along with the timers.
    for (let t = 0; t < ms; t += 100) {
      ;(sound as unknown as { context: FakeContext }).context.currentTime += 0.1
      vi.advanceTimersByTime(100)
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', FakeContext)
    sound = new Sound()
    sound.setVolumes(0.8, 0.3)
    sound.setAudible(true)
    sound.setScene('menu')
  })

  afterEach(() => {
    sound.shutDown()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('plays notes while the music slider is up', () => {
    const before = notes
    play(2000)
    expect(notes - before).toBeGreaterThan(0)
  })

  it('stops making notes at zero, instead of only silencing them', () => {
    sound.setVolumes(0.8, 0)
    const before = notes
    play(2000)
    expect(notes - before).toBe(0)
  })

  it('starts again when the slider comes back up', () => {
    sound.setVolumes(0.8, 0)
    play(1000)
    sound.setVolumes(0.8, 0.2)
    const before = notes
    play(2000)
    expect(notes - before).toBeGreaterThan(0)
  })

  it('does not start on a new scene while the slider is at zero', () => {
    sound.setVolumes(0.8, 0)
    sound.setScene('game')
    const before = notes
    play(2000)
    expect(notes - before).toBe(0)
  })
})
