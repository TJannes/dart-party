import { partyAnimations } from './partyAnimations'
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

// Chords as semitones above middle C.
const chord = (...semitones: number[]): number[] => semitones.map(note)
const C = chord(-12, 0, 4, 7, 12)
const Am = chord(-15, -3, 0, 4, 9)
const F = chord(-19, -7, -3, 0, 5)
const G = chord(-17, -5, -1, 2, 7)

export const party: Theme = {
  id: 'party',
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
    thud: [{ wave: 'sine', from: 160, to: 90, at: 0, length: 0.12, gain: 0.5 }],
    miss: [{ wave: 'sawtooth', from: 220, to: 70, at: 0, length: 0.45, gain: 0.3 }],
    pushed: [
      { wave: 'square', from: 520, to: 180, at: 0, length: 0.4, gain: 0.22 },
      { wave: 'sine', from: 140, to: 80, at: 0.3, length: 0.2, gain: 0.4 },
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
      blip(12, 0.02, 0.2, 0.3),
    ],
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
  animations: partyAnimations,
}
