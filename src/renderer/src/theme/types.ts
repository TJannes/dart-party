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
  /** Time Bomb: a dart burned fuse; faster the more has burned. */
  | 'fuseSlow'
  | 'fuseMid'
  | 'fuseFast'
  /** Time Bomb: the bomb is thrown to the next player. */
  | 'toss'
  | 'boom'
  /** Last One Standing: the glove lands. */
  | 'punch'
  /** Last One Standing: counted out. */
  | 'bell'
  /** Two players left. */
  | 'duel'
  /** Piggy Bank: coins drop into the pig. */
  | 'clink'
  | 'goldCoin'
  /** Piggy Bank: the hammer breaks the pig. */
  | 'smash'
  /** Race: forward, forward on a triple, a banana peel, an oil slick. */
  | 'vroom'
  | 'nitro'
  | 'slip'
  | 'skid'
  /** Robin Hood: an arrow lands, a bird flies up, an arrow is split. */
  | 'arrow'
  | 'bird'
  | 'split'
  /** Spotlight: the beam looks for its target, roses, a cough. */
  | 'drumroll'
  | 'applause'
  | 'cough'
  /** Land Grab: a wall goes up, a stone flies, a wall comes down. */
  | 'build'
  | 'catapult'
  | 'crumble'
  /** Sniper: the scope locks on, the tape measure, the three rings. */
  | 'lock'
  | 'measure'
  | 'medals'
  /** Minefield: the shovel, a chest, a coin, a crab. */
  | 'dig'
  | 'chest'
  | 'flip'
  | 'crab'
  /** Higher or Lower: the call was met, or not. */
  | 'whoosh'
  | 'buzzer'
  /** Raise the Bar: over the bar, or into it. */
  | 'jump'
  | 'clatter'
  /** The drinking game: someone has to drink, someone may hand out. */
  | 'drink'
  | 'handOut'

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
  /** One per seat in a party. */
  playerColours: string[]
  effects: Record<EffectName, Tone[]>
  music: Record<MusicScene, Music>
  /** How each moment looks. Replaceable as a whole or per game. */
  animations: AnimationPack
}
