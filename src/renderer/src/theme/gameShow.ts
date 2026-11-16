import { gameShowAnimations } from './gameShowAnimations'
import { gameShowGames } from './gameShowGames'
import type { Theme, Tone } from './types'

// The default theme: a purple game show. All sound is synthesised here, so
// the pack contains no recordings and needs no licence.

const C4 = 261.63
const note = (semitones: number): number => C4 * 2 ** (semitones / 12)

const blip = (semitones: number, at: number, length = 0.12, gain = 0.5): Tone => ({
  wave: 'triangle',
  from: note(semitones),
  at,
  length,
  gain,
})

/** A run of short ticks, for a burning fuse. */
const ticks = (count: number, over: number, pitch: number): Tone[] =>
  Array.from({ length: count }, (_, n) => ({
    wave: 'square' as const,
    from: pitch + n * 25,
    at: (n * over) / count,
    length: 0.03,
    gain: 0.2,
  }))

/**
 * A short, dry knock in the middle range, like a dart going into the board.
 * Small speakers, such as a laptop's, play almost nothing under 200 Hz, so
 * every low thump gets one of these on top: the thump adds body on a good
 * speaker, the knock keeps it audible on a small one.
 */
const knock = (at: number, gain = 0.4): Tone[] => [
  { wave: 'square', from: 1100, to: 450, at, length: 0.025, gain: gain * 0.3 },
  { wave: 'triangle', from: 560, to: 380, at, length: 0.09, gain },
]

// Chords as semitones above middle C.
const chord = (...semitones: number[]): number[] => semitones.map(note)
const C = chord(-12, 0, 4, 7, 12)
const Am = chord(-15, -3, 0, 4, 9)
const F = chord(-19, -7, -3, 0, 5)
const G = chord(-17, -5, -1, 2, 7)

export const gameShow: Theme = {
  id: 'gameShow',
  colours: {
    'bg-centre': '#7597de',
    'bg-mid': '#4a2a8a',
    'bg-edge': '#2b1055',
    ink: '#2b1055',
    text: '#ffffff',
    gold: '#ffd23f',
    hot: '#ee4266',
    mint: '#3bceac',
  },
  playerColours: ['#ee4266', '#ffd23f', '#3bceac', '#4d9de0', '#f08a4b', '#b388eb', '#8bd450', '#ff8fab'],
  effects: {
    hit: [blip(12, 0), blip(19, 0.09)],
    bigHit: [blip(12, 0), blip(16, 0.08), blip(19, 0.16), blip(24, 0.24, 0.25)],
    thud: [...knock(0, 0.5), { wave: 'sine', from: 160, to: 90, at: 0, length: 0.12, gain: 0.4 }],
    miss: [{ wave: 'sawtooth', from: 220, to: 90, at: 0, length: 0.45, gain: 0.3 }],
    pushed: [
      { wave: 'square', from: 520, to: 180, at: 0, length: 0.4, gain: 0.22 },
      { wave: 'sine', from: 140, to: 80, at: 0.3, length: 0.2, gain: 0.4 },
      ...knock(0.3, 0.3),
    ],
    win: [blip(12, 0), blip(16, 0.14), blip(19, 0.28), blip(24, 0.42, 0.6), blip(16, 0.42, 0.6, 0.3)],
    tick: [{ wave: 'square', from: 1300, at: 0, length: 0.03, gain: 0.18 }],
    reveal: [blip(0, 0, 0.5, 0.35), blip(4, 0, 0.5, 0.35), blip(7, 0, 0.5, 0.35), blip(12, 0.02, 0.6)],
    lifeLost: [
      { wave: 'triangle', from: note(7), to: note(3), at: 0, length: 0.18, gain: 0.45 },
      { wave: 'triangle', from: note(2), to: note(-5), at: 0.18, length: 0.3, gain: 0.45 },
    ],
    knockedOut: [
      { wave: 'sawtooth', from: 440, to: 55, at: 0, length: 0.7, gain: 0.28 },
      { wave: 'sine', from: 120, to: 50, at: 0.62, length: 0.3, gain: 0.6 },
      ...knock(0.62, 0.35),
    ],
    sparkle: [blip(24, 0, 0.1, 0.35), blip(28, 0.07, 0.1, 0.35), blip(31, 0.14, 0.1, 0.35), blip(36, 0.21, 0.5, 0.4), blip(24, 0.21, 0.5, 0.2)],
    trombone: [
      { wave: 'sawtooth', from: note(-2), at: 0, length: 0.28, gain: 0.25 },
      { wave: 'sawtooth', from: note(-3), at: 0.3, length: 0.28, gain: 0.25 },
      { wave: 'sawtooth', from: note(-4), at: 0.6, length: 0.28, gain: 0.25 },
      { wave: 'sawtooth', from: note(-5), to: note(-9), at: 0.9, length: 0.7, gain: 0.25 },
    ],
    turn: [blip(7, 0, 0.08, 0.3), blip(12, 0.08, 0.14, 0.3)],
    coin: [
      { wave: 'square', from: note(23), at: 0, length: 0.06, gain: 0.16 },
      { wave: 'square', from: note(28), at: 0.06, length: 0.22, gain: 0.16 },
    ],
    crown: [blip(12, 0, 0.1), blip(19, 0.1, 0.1), blip(24, 0.2, 0.4), blip(28, 0.2, 0.4, 0.25)],
    climb: [
      { wave: 'sine', from: 180, to: 110, at: 0, length: 0.14, gain: 0.55 },
      ...knock(0, 0.25),
      blip(12, 0.02, 0.2, 0.3),
    ],
    fuseSlow: ticks(2, 0.5, 900),
    fuseMid: ticks(4, 0.5, 1100),
    fuseFast: ticks(8, 0.55, 1300),
    toss: [{ wave: 'sine', from: 280, to: 920, at: 0, length: 0.3, gain: 0.3 }],
    boom: [
      { wave: 'sawtooth', from: 180, to: 35, at: 0, length: 0.5, gain: 0.45 },
      { wave: 'sawtooth', from: 900, to: 150, at: 0, length: 0.25, gain: 0.18 },
      { wave: 'sine', from: 110, to: 28, at: 0, length: 0.9, gain: 0.9 },
      { wave: 'square', from: 70, to: 30, at: 0.05, length: 0.35, gain: 0.3 },
    ],
    punch: [
      { wave: 'square', from: 240, to: 90, at: 0, length: 0.07, gain: 0.3 },
      { wave: 'sine', from: 130, to: 60, at: 0, length: 0.16, gain: 0.7 },
      ...knock(0, 0.3),
    ],
    bell: [blip(31, 0, 0.3, 0.4), blip(31, 0.2, 0.3, 0.4), blip(31, 0.4, 0.7, 0.45), blip(43, 0.4, 0.5, 0.15)],
    duel: [
      { wave: 'sawtooth', from: note(-17), at: 0, length: 0.35, gain: 0.3 },
      { wave: 'sawtooth', from: note(-10), at: 0, length: 0.35, gain: 0.22 },
      { wave: 'sawtooth', from: note(-16), at: 0.45, length: 0.8, gain: 0.3 },
      { wave: 'sawtooth', from: note(-9), at: 0.45, length: 0.8, gain: 0.22 },
    ],
    clink: [
      { wave: 'square', from: note(31), at: 0, length: 0.04, gain: 0.16 },
      { wave: 'triangle', from: note(36), at: 0.04, length: 0.14, gain: 0.35 },
      { wave: 'triangle', from: note(33), at: 0.13, length: 0.1, gain: 0.25 },
    ],
    goldCoin: [blip(24, 0, 0.08, 0.4), blip(28, 0.07, 0.08, 0.4), blip(31, 0.14, 0.08, 0.4), blip(36, 0.21, 0.45, 0.45)],
    smash: [
      { wave: 'sine', from: 150, to: 50, at: 0, length: 0.22, gain: 0.8 },
      { wave: 'square', from: 1400, to: 300, at: 0.02, length: 0.12, gain: 0.2 },
      { wave: 'sawtooth', from: 700, to: 120, at: 0.08, length: 0.25, gain: 0.22 },
    ],
    vroom: [{ wave: 'sawtooth', from: 110, to: 260, at: 0, length: 0.3, gain: 0.25 }],
    nitro: [
      { wave: 'sawtooth', from: 120, to: 520, at: 0, length: 0.45, gain: 0.3 },
      { wave: 'square', from: 240, to: 1040, at: 0.05, length: 0.4, gain: 0.12 },
    ],
    slip: [{ wave: 'sine', from: 900, to: 300, at: 0, length: 0.25, gain: 0.35 }, blip(-5, 0.25, 0.12, 0.4)],
    skid: [
      { wave: 'sawtooth', from: 1100, to: 500, at: 0, length: 0.5, gain: 0.2 },
      { wave: 'square', from: 1150, to: 540, at: 0, length: 0.5, gain: 0.1 },
      blip(-7, 0.5, 0.15, 0.45),
    ],
    arrow: [
      { wave: 'sine', from: 170, to: 80, at: 0, length: 0.08, gain: 0.6 },
      ...knock(0, 0.3),
      { wave: 'triangle', from: 330, to: 300, at: 0.05, length: 0.3, gain: 0.25 },
      { wave: 'triangle', from: 345, to: 315, at: 0.05, length: 0.3, gain: 0.2 },
    ],
    bird: [
      { wave: 'sine', from: 2200, to: 3000, at: 0, length: 0.08, gain: 0.25 },
      { wave: 'sine', from: 2400, to: 3200, at: 0.12, length: 0.08, gain: 0.25 },
      { wave: 'sine', from: 2600, to: 3400, at: 0.24, length: 0.1, gain: 0.2 },
    ],
    split: [
      { wave: 'sawtooth', from: 900, to: 200, at: 0, length: 0.12, gain: 0.3 },
      blip(19, 0.1, 0.1, 0.4),
      blip(26, 0.2, 0.5, 0.45),
    ],
    drumroll: [
      ...Array.from({ length: 14 }, (_, n): Tone => ({ wave: 'triangle', from: 150, to: 110, at: n * 0.06, length: 0.05, gain: 0.25 + n * 0.02 })),
      // The snare's rattle, which a small speaker can play.
      ...Array.from({ length: 14 }, (_, n): Tone => ({ wave: 'square', from: 620, to: 480, at: n * 0.06, length: 0.03, gain: 0.05 + n * 0.006 })),
      { wave: 'sine', from: 120, to: 60, at: 0.86, length: 0.3, gain: 0.8 },
      ...knock(0.86, 0.35),
      blip(24, 0.86, 0.4, 0.35),
    ],
    applause: [blip(12, 0, 0.1, 0.35), blip(16, 0.1, 0.1, 0.35), blip(19, 0.2, 0.1, 0.35), blip(24, 0.3, 0.5, 0.4), blip(19, 0.3, 0.5, 0.25)],
    cough: [
      { wave: 'sawtooth', from: 260, to: 150, at: 0, length: 0.09, gain: 0.3 },
      { wave: 'sawtooth', from: 230, to: 130, at: 0.16, length: 0.12, gain: 0.3 },
    ],
    build: [
      { wave: 'sine', from: 200, to: 120, at: 0, length: 0.07, gain: 0.55 },
      { wave: 'sine', from: 230, to: 140, at: 0.14, length: 0.07, gain: 0.55 },
      { wave: 'sine', from: 260, to: 160, at: 0.28, length: 0.09, gain: 0.55 },
      ...knock(0, 0.3),
      ...knock(0.14, 0.32),
      ...knock(0.28, 0.34),
    ],
    // The landing matches the stone's flight in the timeline (STONE_FLIGHT).
    catapult: [
      { wave: 'triangle', from: 90, to: 240, at: 0, length: 0.12, gain: 0.4 },
      { wave: 'sine', from: 700, to: 300, at: 0.1, length: 0.6, gain: 0.2 },
      { wave: 'sine', from: 130, to: 50, at: 0.7, length: 0.2, gain: 0.8 },
      ...knock(0.7, 0.35),
    ],
    crumble: [
      { wave: 'sawtooth', from: 220, to: 60, at: 0, length: 0.4, gain: 0.3 },
      { wave: 'square', from: 140, to: 50, at: 0.1, length: 0.4, gain: 0.2 },
      { wave: 'sine', from: 90, to: 40, at: 0.3, length: 0.3, gain: 0.6 },
      ...knock(0.3, 0.3),
    ],
    lock: [
      { wave: 'sine', from: 1400, to: 700, at: 0, length: 0.35, gain: 0.2 },
      { wave: 'square', from: 880, at: 0.4, length: 0.05, gain: 0.2 },
      { wave: 'square', from: 1320, at: 0.5, length: 0.12, gain: 0.2 },
    ],
    measure: ticks(6, 0.45, 700),
    medals: [blip(24, 0, 0.3, 0.4), blip(21, 0.2, 0.3, 0.4), blip(17, 0.4, 0.5, 0.4)],
    dig: [
      { wave: 'sawtooth', from: 180, to: 90, at: 0, length: 0.12, gain: 0.3 },
      { wave: 'sawtooth', from: 200, to: 100, at: 0.2, length: 0.12, gain: 0.3 },
    ],
    chest: [blip(7, 0, 0.12, 0.4), blip(12, 0.1, 0.12, 0.4), blip(16, 0.2, 0.12, 0.4), blip(19, 0.3, 0.12, 0.4), blip(24, 0.4, 0.6, 0.45)],
    flip: [
      { wave: 'square', from: note(28), at: 0, length: 0.05, gain: 0.16 },
      { wave: 'triangle', from: note(33), at: 0.06, length: 0.2, gain: 0.35 },
    ],
    crab: ticks(5, 0.4, 500),
    whoosh: [{ wave: 'sine', from: 300, to: 1200, at: 0, length: 0.25, gain: 0.3 }, blip(24, 0.2, 0.2, 0.3)],
    buzzer: [
      { wave: 'sawtooth', from: 110, at: 0, length: 0.45, gain: 0.3 },
      { wave: 'square', from: 117, at: 0, length: 0.45, gain: 0.18 },
    ],
    jump: [{ wave: 'sine', from: 220, to: 880, at: 0, length: 0.35, gain: 0.35 }, blip(24, 0.4, 0.25, 0.35)],
    clatter: [
      { wave: 'square', from: 500, to: 300, at: 0, length: 0.06, gain: 0.25 },
      { wave: 'square', from: 420, to: 250, at: 0.12, length: 0.06, gain: 0.22 },
      { wave: 'square', from: 360, to: 200, at: 0.22, length: 0.08, gain: 0.2 },
    ],
    // Two gulps going down, and a glass being raised.
    drink: [
      { wave: 'sine', from: 620, to: 340, at: 0, length: 0.13, gain: 0.4 },
      { wave: 'sine', from: 560, to: 310, at: 0.2, length: 0.13, gain: 0.4 },
      { wave: 'triangle', from: 330, to: 440, at: 0.4, length: 0.16, gain: 0.3 },
    ],
    handOut: [blip(31, 0, 0.3, 0.3), blip(36, 0.02, 0.45, 0.25), blip(24, 0.25, 0.1, 0.25), blip(28, 0.35, 0.2, 0.3)],
    // Tightening: a few quick steps up to a sharp note. Loosening: the same, falling and softer.
    harder: [blip(12, 0, 0.09, 0.35), blip(16, 0.1, 0.09, 0.35), blip(19, 0.2, 0.09, 0.4), { wave: 'square', from: note(25), at: 0.32, length: 0.3, gain: 0.2 }],
    easier: [blip(19, 0, 0.12, 0.3), blip(16, 0.12, 0.12, 0.3), blip(12, 0.24, 0.35, 0.35)],
    fanfare: [
      blip(7, 0, 0.18),
      blip(7, 0.2, 0.09),
      blip(7, 0.3, 0.09),
      blip(12, 0.42, 0.3),
      blip(16, 0.75, 0.3),
      blip(19, 1.08, 0.9),
      blip(12, 1.08, 0.9, 0.3),
      blip(24, 1.4, 0.7, 0.35),
    ],
  },
  music: {
    menu: { tempo: 84, chords: [C, Am, F, G], wave: 'sine' },
    game: { tempo: 112, chords: [Am, F, C, G], wave: 'triangle' },
    podium: { tempo: 126, chords: [C, F, G, C], wave: 'triangle' },
  },
  animations: { general: gameShowAnimations.general, games: { ...gameShowAnimations.games, ...gameShowGames } },
}
