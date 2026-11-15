import { describe, expect, it } from 'vitest'
import { gameShow } from './gameShow'
import type { Tone } from './types'

/**
 * A laptop speaker, like the Surface's, plays almost nothing under 200 Hz.
 * A pure sine must reach well above that. A triangle or a buzzy wave
 * (square, sawtooth) is also heard through its overtones, so it may sit
 * lower.
 */
function smallSpeakerHears(tone: Tone): boolean {
  const highest = Math.max(tone.from, tone.to ?? tone.from)
  if (tone.wave === 'sine') return highest >= 300
  if (tone.wave === 'triangle') return highest >= 170
  return highest >= 80
}

describe('gameShow theme', () => {
  it('gives every low thump something a small speaker can play', () => {
    const silent: string[] = []
    for (const [name, tones] of Object.entries(gameShow.effects)) {
      for (const tone of tones) {
        if (smallSpeakerHears(tone)) continue
        const covered = tones.some((other) => smallSpeakerHears(other) && Math.abs(other.at - tone.at) <= 0.1)
        if (!covered) silent.push(`${name} at ${tone.at}s`)
      }
    }
    expect(silent).toEqual([])
  })
})
