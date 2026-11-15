import type { AnimationPack } from '../animation/pack'

// A theme pack: everything about the look and the sound that can be swapped
// as one, for a season or a holiday. Only one ships for now.

/** One synthesised tone. Times in seconds from the start of the effect. */
export interface Tone {
  wave: OscillatorType
  /** Hz. With `to`, the pitch slides from `from` to `to`. */
  from: number
  to?: number
  at: number
  length: number
  /** 0 to 1, before the volume setting. */
  gain: number
}

export type EffectName =
  | 'hit'
  | 'bigHit'
  | 'thud'
  | 'miss'
  | 'pushed'
  | 'win'
  | 'tick'
  | 'reveal'
  | 'fanfare'
  | 'lifeLost'
  | 'knockedOut'
  /** A spectacular dart. */
  | 'sparkle'
  /** Three misses in a turn. */
  | 'trombone'
  /** The next player is up. */
  | 'turn'
  /** Points landing on the scoreboard. */
  | 'coin'
  /** The crown hops to a new leader. */
  | 'crown'
  /** Someone lands on their podium step. */
  | 'climb'

export type MusicScene = 'menu' | 'game' | 'podium'

/** A looping tune: a bass note and an arpeggio per chord. */
export interface Music {
  /** Beats per minute. */
  tempo: number
  /** Each chord lasts one bar of four beats; frequencies in Hz, low to high. */
  chords: number[][]
  wave: OscillatorType
}

export interface Theme {
  id: string
  /** CSS custom properties, without the leading dashes. */
  colours: Record<string, string>
  /** One per seat in an evening. */
  playerColours: string[]
  effects: Record<EffectName, Tone[]>
  music: Record<MusicScene, Music>
  /** How each moment looks. Replaceable as a whole or per game. */
  animations: AnimationPack
}
