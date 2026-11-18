import { motion, type TargetAndTransition } from 'motion/react'
import type { AvatarId } from '../../../core/players'
import { isAvatar } from '../../../core/players'

// The animals are drawn from a handful of parts (a new one is one line in
// SPECS); the other characters each have their own drawing in CHARACTERS.
// All of them wear the same face, so every mood works on every avatar.

export type Mood = 'idle' | 'cheer' | 'sulk' | 'shocked' | 'hit' | 'laugh' | 'sweat' | 'out'

export const MOODS: readonly Mood[] = ['idle', 'cheer', 'sulk', 'shocked', 'hit', 'laugh', 'sweat', 'out']

type Ears = 'pointy' | 'round' | 'big' | 'long' | 'floppy' | 'tufts' | 'side' | 'horns' | 'bumps' | 'none'
type Face = 'muzzle' | 'mask' | 'none'
type Nose = 'nose' | 'pig' | 'beak' | 'trunk' | 'none'
type Extra = 'mane' | 'stripes' | 'eyepatch' | 'patch' | 'comb' | 'horn'

interface Spec {
  fur: string
  /** Inner ears, muzzle, mask. */
  light: string
  ears: Ears
  face: Face
  nose: Nose
  extra?: Extra
  /** Colour of the extra, where it has one. */
  extraColour?: string
}

type AnimalId = 'fox' | 'cat' | 'dog' | 'bear' | 'panda' | 'koala' | 'rabbit' | 'mouse' | 'lion' | 'tiger' | 'pig' | 'cow' | 'monkey' | 'frog' | 'owl' | 'penguin' | 'chicken' | 'unicorn' | 'elephant' | 'wolf'

const SPECS: Record<AnimalId, Spec> = {
  fox: { fur: '#f28c38', light: '#fff4e6', ears: 'pointy', face: 'muzzle', nose: 'nose' },
  cat: { fur: '#9aa5b1', light: '#f4c7d0', ears: 'pointy', face: 'none', nose: 'nose' },
  dog: { fur: '#c98f5a', light: '#f6e3cf', ears: 'floppy', face: 'muzzle', nose: 'nose' },
  bear: { fur: '#8a5a3c', light: '#d9b38c', ears: 'round', face: 'muzzle', nose: 'nose' },
  panda: { fur: '#ffffff', light: '#2f2f3a', ears: 'round', face: 'none', nose: 'nose', extra: 'eyepatch' },
  koala: { fur: '#a9b4c2', light: '#e8edf2', ears: 'big', face: 'none', nose: 'nose' },
  rabbit: { fur: '#f3ece4', light: '#f7b6c2', ears: 'long', face: 'none', nose: 'nose' },
  mouse: { fur: '#c9c3d6', light: '#f7b6c2', ears: 'big', face: 'none', nose: 'nose' },
  lion: { fur: '#f6c453', light: '#fff1cc', ears: 'round', face: 'muzzle', nose: 'nose', extra: 'mane', extraColour: '#c7702a' },
  tiger: { fur: '#f59e3d', light: '#fff4e6', ears: 'round', face: 'muzzle', nose: 'nose', extra: 'stripes' },
  pig: { fur: '#f7a8b8', light: '#f48ba0', ears: 'pointy', face: 'none', nose: 'pig' },
  cow: { fur: '#ffffff', light: '#f7b6c2', ears: 'horns', face: 'muzzle', nose: 'nose', extra: 'patch' },
  monkey: { fur: '#8b5e3c', light: '#f0cfa8', ears: 'side', face: 'mask', nose: 'nose' },
  frog: { fur: '#6cc04a', light: '#c9f0a8', ears: 'bumps', face: 'none', nose: 'none' },
  owl: { fur: '#9c6b43', light: '#f1dfc4', ears: 'tufts', face: 'mask', nose: 'beak' },
  penguin: { fur: '#39405a', light: '#ffffff', ears: 'none', face: 'mask', nose: 'beak' },
  chicken: { fur: '#fff6e0', light: '#fff6e0', ears: 'none', face: 'none', nose: 'beak', extra: 'comb' },
  unicorn: { fur: '#ffffff', light: '#f9c5e8', ears: 'pointy', face: 'none', nose: 'nose', extra: 'horn', extraColour: '#b388eb' },
  elephant: { fur: '#8fa6c4', light: '#c5d3e6', ears: 'big', face: 'none', nose: 'trunk' },
  wolf: { fur: '#5d6676', light: '#dfe4ea', ears: 'pointy', face: 'muzzle', nose: 'nose' },
}

const INK = '#2a1b3d'

function EarShapes({ ears, fur, light }: Spec): React.JSX.Element | null {
  const both = (one: (flip: boolean) => React.JSX.Element) => (
    <>
      {one(false)}
      <g transform="translate(100 0) scale(-1 1)">{one(true)}</g>
    </>
  )
  switch (ears) {
    case 'pointy':
      return both(() => (
        <>
          <path d="M17 40 L24 6 L47 24 Z" fill={fur} />
          <path d="M23 32 L27 15 L39 25 Z" fill={light} />
        </>
      ))
    case 'round':
      return both(() => (
        <>
          <circle cx="24" cy="26" r="12" fill={fur} />
          <circle cx="24" cy="26" r="6" fill={light} />
        </>
      ))
    case 'big':
      return both(() => (
        <>
          <circle cx="17" cy="34" r="17" fill={fur} />
          <circle cx="17" cy="34" r="10" fill={light} />
        </>
      ))
    case 'long':
      return both(() => (
        <>
          <ellipse cx="36" cy="18" rx="8" ry="20" fill={fur} />
          <ellipse cx="36" cy="18" rx="4" ry="14" fill={light} />
        </>
      ))
    case 'floppy':
      return both(() => <ellipse cx="15" cy="50" rx="10" ry="20" fill="#7a4f2a" transform="rotate(12 15 50)" />)
    case 'tufts':
      return both(() => <path d="M22 34 L24 10 L42 24 Z" fill={fur} />)
    case 'side':
      return both(() => (
        <>
          <circle cx="14" cy="54" r="10" fill={fur} />
          <circle cx="14" cy="54" r="5" fill={light} />
        </>
      ))
    case 'horns':
      return both(() => (
        <>
          <ellipse cx="13" cy="42" rx="11" ry="6" fill={light} transform="rotate(-20 13 42)" />
          <path d="M28 26 Q22 12 30 8 Q32 18 38 22 Z" fill="#e8dcc0" />
        </>
      ))
    case 'bumps':
      return both(() => <circle cx="33" cy="28" r="13" fill={fur} />)
    case 'none':
      return null
  }
}

function Extras({ extra, extraColour }: Spec, behind: boolean): React.JSX.Element | null {
  if (behind) {
    if (extra === 'mane') return <circle cx="50" cy="54" r="44" fill={extraColour} />
    return null
  }
  switch (extra) {
    case 'stripes':
      return (
        <g fill={INK}>
          <path d="M50 20 L46 32 L54 32 Z" />
          <path d="M38 22 L38 31 L44 29 Z" />
          <path d="M62 22 L62 31 L56 29 Z" />
          <path d="M16 56 L26 54 L26 60 Z" />
          <path d="M84 56 L74 54 L74 60 Z" />
        </g>
      )
    case 'eyepatch':
      return (
        <g fill="#2f2f3a">
          <ellipse cx="37" cy="50" rx="9" ry="11" transform="rotate(-20 37 50)" />
          <ellipse cx="63" cy="50" rx="9" ry="11" transform="rotate(20 63 50)" />
        </g>
      )
    case 'patch':
      return <path d="M58 22 Q80 24 82 44 Q70 48 62 40 Q56 32 58 22 Z" fill="#3a3340" />
    case 'comb':
      return (
        <g fill="#e63946">
          <circle cx="42" cy="20" r="7" />
          <circle cx="52" cy="16" r="8" />
          <circle cx="61" cy="21" r="6" />
        </g>
      )
    case 'horn':
      return (
        <>
          <path d="M62 30 Q84 34 80 62 Q72 50 64 46 Z" fill={extraColour} />
          <path d="M44 24 L50 0 L56 24 Z" fill="#ffd23f" />
        </>
      )
    default:
      return null
  }
}

function Eyes({ mood, frog, onDark, gap = 12 }: { mood: Mood; frog: boolean; onDark: boolean; gap?: number }): React.JSX.Element {
  const y = frog ? 28 : 50
  const [left, right] = frog ? [33, 67] : [50 - gap, 50 + gap]
  const ink = onDark ? '#ffffff' : INK
  if (mood === 'hit' || mood === 'out') {
    // Squeezed shut after a knock, or crossed out.
    const mark = (x: number, flip: 1 | -1): string =>
      mood === 'out'
        ? `M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x - 5} ${y + 5} L${x + 5} ${y - 5}`
        : `M${x - 5 * flip} ${y - 5} L${x + 4 * flip} ${y} L${x - 5 * flip} ${y + 5}`
    return (
      <g fill="none" stroke={frog ? INK : ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {frog && <circle cx={left} cy={y} r="8" fill="#fff" stroke="none" />}
        {frog && <circle cx={right} cy={y} r="8" fill="#fff" stroke="none" />}
        <path d={mark(left, 1)} />
        <path d={mark(right, -1)} />
      </g>
    )
  }
  if (mood === 'shocked') {
    return (
      <g>
        <circle cx={left} cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <circle cx={right} cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <circle cx={left} cy={y} r="2.6" fill={INK} />
        <circle cx={right} cy={y} r="2.6" fill={INK} />
      </g>
    )
  }
  if (mood === 'cheer' || mood === 'laugh') {
    return (
      <g fill={frog ? '#fff' : 'none'} stroke={frog ? INK : ink} strokeWidth="3.5" strokeLinecap="round">
        {frog && <circle cx={left} cy={y} r="8" stroke="none" />}
        {frog && <circle cx={right} cy={y} r="8" stroke="none" />}
        <path d={`M${left - 5} ${y + 2} Q${left} ${y - 6} ${left + 5} ${y + 2}`} />
        <path d={`M${right - 5} ${y + 2} Q${right} ${y - 6} ${right + 5} ${y + 2}`} />
      </g>
    )
  }
  return (
    <g>
      {frog && (
        <>
          <circle cx={left} cy={y} r="8" fill="#fff" />
          <circle cx={right} cy={y} r="8" fill="#fff" />
        </>
      )}
      <circle cx={left} cy={y + (mood === 'sulk' ? 1.5 : 0)} r="4.5" fill={frog ? INK : ink} />
      <circle cx={right} cy={y + (mood === 'sulk' ? 1.5 : 0)} r="4.5" fill={frog ? INK : ink} />
      {mood === 'idle' && (
        <g fill={onDark && !frog ? INK : '#fff'}>
          <circle cx={left + 1.5} cy={y - 1.5} r="1.4" />
          <circle cx={right + 1.5} cy={y - 1.5} r="1.4" />
        </g>
      )}
      {mood === 'sulk' && (
        <g stroke={frog ? INK : ink} strokeWidth="3" strokeLinecap="round">
          <path d={`M${left - 7} ${y - 9} L${left + 5} ${y - 5}`} />
          <path d={`M${right + 7} ${y - 9} L${right - 5} ${y - 5}`} />
        </g>
      )}
      {mood === 'sweat' && (
        // Worried brows: up in the middle.
        <g stroke={frog ? INK : ink} strokeWidth="3" strokeLinecap="round">
          <path d={`M${left - 6} ${y - 6} L${left + 5} ${y - 10}`} />
          <path d={`M${right + 6} ${y - 6} L${right - 5} ${y - 10}`} />
        </g>
      )}
    </g>
  )
}

function Mouth({ mood, y, ink }: { mood: Mood; y: number; ink?: string }): React.JSX.Element {
  return <MouthShape mood={mood} y={y} INK={ink ?? INK} />
}

function MouthShape({ mood, y, INK }: { mood: Mood; y: number; INK: string }): React.JSX.Element {
  // On a dark face an open mouth gets a light rim, or it disappears.
  const rim = INK === '#ffffff' ? { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const } : {}
  if (mood === 'cheer') return <path d={`M42 ${y - 2} Q50 ${y + 13} 58 ${y - 2} Z`} fill="#8c1c3a" {...rim} />
  if (mood === 'laugh') {
    return (
      <g>
        <path d={`M39 ${y - 3} Q50 ${y + 19} 61 ${y - 3} Z`} fill="#8c1c3a" {...rim} />
        <path d={`M45 ${y + 6} Q50 ${y + 2} 55 ${y + 6} Q50 ${y + 12} 45 ${y + 6} Z`} fill="#ff8fab" />
      </g>
    )
  }
  if (mood === 'shocked') return <ellipse cx="50" cy={y + 3} rx="4.5" ry="6" fill="#8c1c3a" {...rim} />
  if (mood === 'hit') {
    return <path d={`M41 ${y + 2} L45.5 ${y - 2} L50 ${y + 2} L54.5 ${y - 2} L59 ${y + 2}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  }
  if (mood === 'sweat') {
    return <path d={`M42 ${y + 2} Q46 ${y - 2} 50 ${y + 2} Q54 ${y + 6} 58 ${y + 2}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
  }
  if (mood === 'out') {
    return (
      <g>
        <path d={`M43 ${y + 1} L57 ${y + 1}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d={`M50 ${y + 1} L57 ${y + 1} L57 ${y + 6} Q53.5 ${y + 10} 50 ${y + 6} Z`} fill="#ff8fab" />
      </g>
    )
  }
  const d = mood === 'sulk' ? `M44 ${y + 4} Q50 ${y - 2} 56 ${y + 4}` : `M44 ${y} Q50 ${y + 6} 56 ${y}`
  return <path d={d} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
}

// Every mood names every property it moves, so nothing is left hanging
// from the mood before it.
const MOTION: Record<Mood, TargetAndTransition> = {
  idle: { x: 0, y: [0, -1.5, 0], rotate: 0, scale: 1, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  cheer: { x: 0, y: [0, -14, 0], rotate: [0, -6, 6, 0], scale: 1, transition: { duration: 0.6, repeat: Infinity, ease: 'easeOut' } },
  sulk: { x: 0, y: 5, rotate: [0, -4, 0], scale: 1, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  shocked: { x: 0, y: [0, -10, 0], rotate: 0, scale: [1, 1.15, 1], transition: { duration: 0.45, ease: 'easeOut' } },
  hit: { x: [0, -9, 9, -6, 6, 0], y: 0, rotate: [0, -10, 8, -5, 0], scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  laugh: { x: 0, y: [0, -5, 0], rotate: [0, -3, 3, 0], scale: 1, transition: { duration: 0.28, repeat: Infinity, ease: 'easeInOut' } },
  sweat: { x: [0, -1.5, 1.5, 0], y: 0, rotate: 0, scale: 1, transition: { duration: 0.22, repeat: Infinity, ease: 'linear' } },
  out: { x: 0, y: 7, rotate: 18, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

/** Things around the head that belong to a mood: sweat drops, dizzy stars. */
function MoodMarks({ mood }: { mood: Mood }): React.JSX.Element | null {
  if (mood === 'sweat') {
    const drop = 'M0 -6 Q5 1 0 4 Q-5 1 0 -6 Z'
    return (
      <g fill="#7fd4ff" stroke="#2b7fb8" strokeWidth="1">
        {[
          { x: 13, y: 34, delay: 0 },
          { x: 88, y: 42, delay: 0.45 },
        ].map((at) => (
          <motion.path
            key={at.x}
            d={drop}
            initial={{ x: at.x, y: at.y, opacity: 0 }}
            animate={{ y: [at.y, at.y + 16], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: at.delay, ease: 'easeIn' }}
          />
        ))}
      </g>
    )
  }
  if (mood === 'out') {
    const star = 'M0 -5 L1.5 -1.5 L5 -1.5 L2.2 0.8 L3.2 4.5 L0 2.3 L-3.2 4.5 L-2.2 0.8 L-5 -1.5 L-1.5 -1.5 Z'
    return (
      <g fill="#ffd23f" stroke="#b8860b" strokeWidth="0.8">
        {[
          { x: 30, y: 13 },
          { x: 50, y: 6 },
          { x: 70, y: 13 },
        ].map((at, n) => (
          <motion.path
            key={at.x}
            d={star}
            initial={{ x: at.x, y: at.y, scale: 0.6 }}
            animate={{ y: [at.y, at.y - 4, at.y], scale: [0.6, 1.1, 0.6] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: n * 0.3, ease: 'easeInOut' }}
          />
        ))}
      </g>
    )
  }
  return null
}

/** Soot after a bomb: hair on end and a wisp of smoke. */
function Soot(): React.JSX.Element {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M30 24 L24 8 M40 19 L38 2 M50 17 L52 0 M60 19 L65 3 M70 24 L78 10" stroke="#17131f" strokeWidth="4" />
      {[36, 62].map((x, n) => (
        <motion.path
          key={x}
          d="M0 0 q-5 -6 0 -12 q5 -6 0 -12"
          stroke="#cfcbd8"
          strokeWidth="3"
          initial={{ x, y: 8, opacity: 0 }}
          animate={{ y: [8, -6], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: n * 0.9, ease: 'easeOut' }}
        />
      ))}
    </g>
  )
}

/**
 * A character with a drawing of its own. The face (eyes on y 50 around
 * x 50, mouth below) is moved to `face` and scaled to fit the drawing.
 */
interface Character {
  /** Drawn under the face. */
  body: () => React.JSX.Element
  /** Drawn over the face, like an eye patch. */
  front?: () => React.JSX.Element
  face: { x: number; y: number; scale?: number; gap?: number }
  /** The eyes sit on something dark and are drawn light. */
  darkEyes?: boolean
  /** The mouth sits on something dark. */
  darkMouth?: boolean
  /** Has a beak instead, like the birds among the animals. */
  noMouth?: boolean
}

const RIM = 'rgb(0 0 0 / 14%)'

const CHARACTERS: Record<Exclude<AvatarId, AnimalId>, Character> = {
  potato: {
    body: () => (
      <g>
        <path d="M50 8 C74 8 88 30 86 56 C84 82 68 96 48 95 C26 94 12 78 14 54 C16 28 28 8 50 8 Z" fill="#d9a55b" stroke={RIM} strokeWidth="1.5" />
        <g fill="#b47c3c">
          <circle cx="30" cy="30" r="3.5" />
          <circle cx="68" cy="24" r="2.5" />
          <circle cx="78" cy="48" r="3" />
          <circle cx="22" cy="62" r="3" />
          <circle cx="72" cy="78" r="3.5" />
          <circle cx="34" cy="84" r="2.5" />
          <circle cx="52" cy="20" r="2" />
        </g>
      </g>
    ),
    face: { x: 50, y: 50 },
  },
  poo: {
    body: () => (
      <g fill="#8b5a2b" stroke={RIM} strokeWidth="1.5">
        <ellipse cx="50" cy="82" rx="44" ry="15" />
        <ellipse cx="50" cy="62" rx="35" ry="14" />
        <ellipse cx="50" cy="43" rx="24" ry="12" />
        <path d="M38 36 Q40 14 62 6 Q56 20 64 36 Z" />
      </g>
    ),
    face: { x: 50, y: 64, scale: 0.9 },
  },
  pizza: {
    body: () => (
      <g>
        <path d="M12 22 L88 22 L52 94 Q50 97 48 94 Z" fill="#ffc93c" stroke={RIM} strokeWidth="1.5" strokeLinejoin="round" />
        <g fill="#e0453a">
          <circle cx="24" cy="32" r="6" />
          <circle cx="75" cy="34" r="5" />
          <circle cx="55" cy="80" r="4.5" />
          <circle cx="39" cy="70" r="3.5" />
        </g>
        <path d="M8 22 Q8 10 22 10 L78 10 Q92 10 92 22 Q92 28 86 28 Q50 22 14 28 Q8 28 8 22 Z" fill="#d98a3d" stroke={RIM} strokeWidth="1.5" />
      </g>
    ),
    face: { x: 50, y: 42, scale: 0.85 },
  },
  burger: {
    body: () => (
      <g stroke={RIM} strokeWidth="1.5">
        <rect x="10" y="66" width="80" height="18" rx="9" fill="#f0a04b" />
        <rect x="12" y="54" width="76" height="14" rx="7" fill="#6b3a24" />
        <path d="M30 56 L50 68 L70 56 Z" fill="#ffcc33" stroke="none" />
        <path d="M8 50 Q14 58 20 52 Q26 60 32 52 Q38 60 44 52 Q50 60 56 52 Q62 60 68 52 Q74 60 80 52 Q86 58 92 50 Z" fill="#7cc84a" />
        <path d="M10 50 Q10 14 50 14 Q90 14 90 50 Z" fill="#f0a04b" />
        <g fill="#fff6e0" stroke="none">
          <ellipse cx="34" cy="24" rx="2.4" ry="1.5" />
          <ellipse cx="50" cy="20" rx="2.4" ry="1.5" />
          <ellipse cx="66" cy="24" rx="2.4" ry="1.5" />
          <ellipse cx="24" cy="34" rx="2.4" ry="1.5" />
          <ellipse cx="76" cy="34" rx="2.4" ry="1.5" />
        </g>
      </g>
    ),
    face: { x: 50, y: 33, scale: 0.75 },
  },
  fries: {
    body: () => (
      <g>
        <g fill="#ffcc33" stroke="#e0a21a" strokeWidth="1">
          <rect x="22" y="14" width="9" height="40" rx="2" transform="rotate(-10 26 34)" />
          <rect x="33" y="8" width="9" height="44" rx="2" transform="rotate(-4 37 30)" />
          <rect x="45" y="5" width="9" height="46" rx="2" />
          <rect x="57" y="8" width="9" height="44" rx="2" transform="rotate(5 61 30)" />
          <rect x="68" y="14" width="9" height="40" rx="2" transform="rotate(11 72 34)" />
        </g>
        <path d="M12 38 Q50 46 88 38 L80 94 L20 94 Z" fill="#e63946" stroke={RIM} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    ),
    face: { x: 50, y: 62, scale: 0.9 },
  },
  beer: {
    body: () => (
      <g>
        <path d="M70 40 L82 40 Q92 40 92 50 L92 72 Q92 82 82 82 L70 82" fill="none" stroke="#f4f4f8" strokeWidth="7" />
        <rect x="14" y="26" width="60" height="70" rx="9" fill="#f4f4f8" stroke={RIM} strokeWidth="1.5" />
        <rect x="19" y="32" width="50" height="58" rx="6" fill="#ffc42e" />
        <g fill="#ffe08a">
          <circle cx="28" cy="80" r="2" />
          <circle cx="60" cy="74" r="1.6" />
          <circle cx="58" cy="84" r="2.2" />
        </g>
        <g fill="#ffffff">
          <circle cx="20" cy="28" r="10" />
          <circle cx="34" cy="20" r="12" />
          <circle cx="50" cy="20" r="11" />
          <circle cx="64" cy="26" r="11" />
          <rect x="14" y="24" width="60" height="14" rx="6" />
          <circle cx="84" cy="10" r="3.5" />
          <circle cx="90" cy="20" r="2.5" />
        </g>
      </g>
    ),
    face: { x: 44, y: 54, scale: 0.85 },
  },
  donut: {
    body: () => (
      <g>
        <path
          d="M50 12 A40 40 0 1 1 49.9 12 Z M50 28 A9 9 0 1 0 50.1 28 Z"
          fillRule="evenodd"
          fill="#f2b26b"
          stroke={RIM}
          strokeWidth="1.5"
        />
        <path
          d="M14 50 A36 36 0 0 1 86 50 Q82 60 76 54 Q70 62 62 56 Q56 63 48 56 Q40 62 34 55 Q26 62 20 55 Q16 58 14 50 Z M50 28 A9 9 0 1 0 50.1 28 Z"
          fillRule="evenodd"
          fill="#ff8fb8"
        />
        <g strokeWidth="2.6" strokeLinecap="round">
          <path d="M26 30 l4 -3" stroke="#7fd4ff" />
          <path d="M70 26 l3 4" stroke="#ffd23f" />
          <path d="M38 20 l5 0" stroke="#7cc84a" />
          <path d="M62 44 l3 3" stroke="#ffffff" />
          <path d="M24 44 l4 2" stroke="#ffd23f" />
          <path d="M76 40 l3 -4" stroke="#7cc84a" />
          <path d="M56 18 l4 2" stroke="#b388eb" />
          <path d="M34 42 l2 4" stroke="#b388eb" />
        </g>
      </g>
    ),
    face: { x: 50, y: 64, scale: 0.8 },
  },
  watermelon: {
    body: () => (
      <g>
        <path d="M8 76 Q50 98 92 76 L90 84 Q50 106 10 84 Z" fill="#3a9d3a" />
        <path d="M10 74 Q50 94 90 74 L92 78 Q50 100 8 78 Z" fill="#f6f2c0" />
        <path d="M50 8 Q53 8 55 12 L90 74 Q50 94 10 74 L45 12 Q47 8 50 8 Z" fill="#f0524f" stroke={RIM} strokeWidth="1.5" />
        <g fill="#2a1b3d">
          <ellipse cx="38" cy="40" rx="1.6" ry="2.6" />
          <ellipse cx="62" cy="40" rx="1.6" ry="2.6" />
          <ellipse cx="50" cy="28" rx="1.6" ry="2.6" />
          <ellipse cx="28" cy="70" rx="1.6" ry="2.6" />
          <ellipse cx="72" cy="70" rx="1.6" ry="2.6" />
        </g>
      </g>
    ),
    face: { x: 50, y: 56, scale: 0.85 },
  },
  avocado: {
    body: () => (
      <g>
        <path d="M50 6 C64 6 70 22 76 38 C86 60 86 94 50 94 C14 94 14 60 24 38 C30 22 36 6 50 6 Z" fill="#4f9a2f" stroke={RIM} strokeWidth="1.5" />
        <path d="M50 12 C61 12 66 26 71 40 C80 60 80 88 50 88 C20 88 20 60 29 40 C34 26 39 12 50 12 Z" fill="#cdea7a" />
        <circle cx="50" cy="70" r="14" fill="#8b5a2b" />
        <circle cx="45" cy="65" r="4" fill="#a8744a" />
      </g>
    ),
    face: { x: 50, y: 36, scale: 0.75 },
  },
  ghost: {
    body: () => (
      <g fill="#ffffff" stroke="#d8d4e4" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M24 52 Q12 56 8 48 Q14 44 24 46 Z" />
        <path d="M76 52 Q88 56 92 48 Q86 44 76 46 Z" />
        <path d="M22 50 Q22 10 50 10 Q78 10 78 50 L80 86 Q74 95 68 87 Q62 95 56 87 Q50 95 44 87 Q38 95 32 87 Q26 95 20 86 Z" />
      </g>
    ),
    face: { x: 50, y: 40, scale: 0.9 },
  },
  ninja: {
    body: () => (
      <g>
        <path d="M80 28 Q92 22 98 30 Q90 32 84 36 Z M80 30 Q90 36 92 46 Q84 40 78 38 Z" fill="#e63946" />
        <circle cx="50" cy="52" r="40" fill="#24202c" stroke={RIM} strokeWidth="1.5" />
        <rect x="18" y="40" width="64" height="20" rx="10" fill="#f2c49b" />
        <path d="M12 34 Q50 20 88 34 L87 26 Q50 12 13 26 Z" fill="#e63946" />
      </g>
    ),
    face: { x: 50, y: 50, scale: 0.9 },
    darkMouth: true,
  },
  pirate: {
    body: () => (
      <g>
        <circle cx="16" cy="54" r="7" fill="#f2c49b" />
        <circle cx="84" cy="54" r="7" fill="#f2c49b" />
        <circle cx="86" cy="64" r="3.5" fill="none" stroke="#ffcc33" strokeWidth="2" />
        <ellipse cx="50" cy="54" rx="34" ry="32" fill="#f2c49b" stroke={RIM} strokeWidth="1.5" />
        <path d="M17 58 Q20 96 50 96 Q80 96 83 58 Q78 66 70 64 Q60 60 50 62 Q40 60 30 64 Q22 66 17 58 Z" fill="#7a4a2a" />
        <ellipse cx="50" cy="73" rx="10" ry="6.5" fill="#f2c49b" />
        <path d="M38 66 Q44 62 50 65 Q56 62 62 66 Q56 68 50 67 Q44 68 38 66 Z" fill="#5e3820" />
        <path d="M6 36 Q14 2 50 2 Q86 2 94 36 Q50 26 6 36 Z" fill="#24202c" stroke="#ffcc33" strokeWidth="2.5" strokeLinejoin="round" />
        <g fill="#ffffff">
          <circle cx="50" cy="15" r="5" />
          <path d="M42 22 L58 28 M58 22 L42 28" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g fill="#24202c">
          <circle cx="48" cy="15" r="1.2" />
          <circle cx="52" cy="15" r="1.2" />
        </g>
      </g>
    ),
    front: () => (
      <g>
        <path d="M17 44 L38 49 L80 30" fill="none" stroke="#24202c" strokeWidth="2" />
        <ellipse cx="38" cy="49" rx="8" ry="7" fill="#24202c" />
      </g>
    ),
    face: { x: 50, y: 49, scale: 0.85, gap: 14 },
  },
  alien: {
    body: () => (
      <g>
        <g stroke="#6cc04a" strokeWidth="3" strokeLinecap="round">
          <path d="M36 20 Q30 12 26 6" fill="none" />
          <path d="M64 20 Q70 12 74 6" fill="none" />
        </g>
        <circle cx="26" cy="6" r="5" fill="#7ed957" />
        <circle cx="74" cy="6" r="5" fill="#7ed957" />
        <path d="M50 16 C80 16 90 36 86 54 C82 74 62 94 50 94 C38 94 18 74 14 54 C10 36 20 16 50 16 Z" fill="#7ed957" stroke={RIM} strokeWidth="1.5" />
        <g fill="#24202c">
          <ellipse cx="33" cy="52" rx="13" ry="9" transform="rotate(28 33 52)" />
          <ellipse cx="67" cy="52" rx="13" ry="9" transform="rotate(-28 67 52)" />
        </g>
      </g>
    ),
    face: { x: 50, y: 52, scale: 0.85, gap: 20 },
    darkEyes: true,
  },
  star: {
    body: () => (
      <path
        d="M50 8 L61.8 37.8 L93.7 39.8 L69 60.2 L77 91.2 L50 74 L23 91.2 L31 60.2 L6.3 39.8 L38.2 37.8 Z"
        fill="#ffd23f"
        stroke="#e0a21a"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    ),
    face: { x: 50, y: 52, scale: 0.8 },
  },
  whisky: {
    body: () => (
      <g>
        <rect x="41" y="10" width="18" height="24" rx="3" fill="#b8692a" />
        <rect x="39" y="3" width="22" height="11" rx="3" fill="#8c1c3a" />
        <path d="M41 30 L59 30 Q78 34 78 50 L78 90 Q78 96 72 96 L28 96 Q22 96 22 90 L22 50 Q22 34 41 30 Z" fill="#c8742a" stroke={RIM} strokeWidth="1.5" />
        <path d="M27 50 Q27 40 36 37" fill="none" stroke="#e8a35c" strokeWidth="3" strokeLinecap="round" />
        <rect x="27" y="50" width="46" height="34" rx="4" fill="#f3e2b8" />
        <rect x="27" y="50" width="46" height="5" fill="#8c1c3a" />
      </g>
    ),
    face: { x: 50, y: 63, scale: 0.75 },
  },
  orc: {
    body: () => (
      <g>
        <path d="M22 46 L0 34 L22 62 Z" fill="#5f8a3c" />
        <path d="M78 46 L100 34 L78 62 Z" fill="#5f8a3c" />
        <path d="M42 22 Q50 2 58 22 Z" fill="#24202c" />
        <ellipse cx="50" cy="56" rx="32" ry="34" fill="#6f9a4a" stroke={RIM} strokeWidth="1.5" />
        <path d="M26 42 Q50 34 74 42 L74 45 Q50 38 26 45 Z" fill="#4f7a32" />
        <ellipse cx="50" cy="63" rx="5" ry="3.4" fill="#4f7a32" />
      </g>
    ),
    front: () => (
      <g fill="#fff6e0" stroke="#c9bfa4" strokeWidth="1">
        <path d="M37 82 L35 68 L42 80 Z" />
        <path d="M63 82 L65 68 L58 80 Z" />
      </g>
    ),
    face: { x: 50, y: 50 },
  },
  ogre: {
    body: () => (
      <g>
        <circle cx="13" cy="56" r="8" fill="#a8975a" />
        <circle cx="87" cy="56" r="8" fill="#a8975a" />
        <path d="M50 14 C80 14 90 36 88 58 C86 84 70 94 50 94 C30 94 14 84 12 58 C10 36 20 14 50 14 Z" fill="#b8a86a" stroke={RIM} strokeWidth="1.5" />
        <g fill="none" stroke="#5e4a2a" strokeWidth="2" strokeLinecap="round">
          <path d="M44 16 Q42 8 38 6" />
          <path d="M50 14 Q51 6 50 2" />
          <path d="M56 16 Q59 9 63 7" />
        </g>
        <g fill="#8c7a42">
          <circle cx="28" cy="34" r="3" />
          <circle cx="74" cy="76" r="2.5" />
          <circle cx="72" cy="30" r="2" />
        </g>
      </g>
    ),
    front: () => <ellipse cx="50" cy="62" rx="8" ry="5.5" fill="#8c7a42" />,
    face: { x: 50, y: 48 },
  },
  devil: {
    body: () => (
      <g>
        <path d="M80 80 Q98 86 92 64" fill="none" stroke="#b81d2c" strokeWidth="3" strokeLinecap="round" />
        <path d="M92 60 L86 68 L96 68 Z" fill="#b81d2c" />
        <path d="M28 32 Q18 16 24 4 Q30 20 42 26 Z" fill="#fff1d6" stroke="#d9c39a" strokeWidth="1.5" />
        <path d="M72 32 Q82 16 76 4 Q70 20 58 26 Z" fill="#fff1d6" stroke="#d9c39a" strokeWidth="1.5" />
        <circle cx="50" cy="54" r="35" fill="#e63946" stroke={RIM} strokeWidth="1.5" />
        <path d="M42 86 Q50 100 58 86 Z" fill="#8c1c3a" />
      </g>
    ),
    face: { x: 50, y: 50 },
  },
  towel: {
    body: () => (
      <g>
        <rect x="18" y="8" width="64" height="82" rx="8" fill="#7fc8f8" stroke={RIM} strokeWidth="1.5" />
        <rect x="18" y="18" width="64" height="5" fill="#ffffff" />
        <rect x="18" y="74" width="64" height="5" fill="#ffffff" />
        <g stroke="#7fc8f8" strokeWidth="2.5" strokeLinecap="round">
          {[24, 31, 38, 45, 52, 59, 66, 73].map((x) => (
            <path key={x} d={`M${x + 2} 88 L${x + 2} 96`} />
          ))}
        </g>
      </g>
    ),
    face: { x: 50, y: 44, scale: 0.9 },
  },
  butter: {
    body: () => (
      <g strokeLinejoin="round">
        <ellipse cx="50" cy="84" rx="47" ry="12" fill="#e8f1fb" stroke="#9fb8d6" strokeWidth="2" />
        <path d="M74 44 L90 32 L90 74 L74 86 Z" fill="#f2c94c" stroke={RIM} strokeWidth="1.5" />
        <path d="M8 44 L24 32 L90 32 L74 44 Z" fill="#fff3b0" stroke={RIM} strokeWidth="1.5" />
        <rect x="8" y="44" width="66" height="42" fill="#ffe27a" stroke={RIM} strokeWidth="1.5" />
        <path d="M50 44 L66 32 L90 32 L90 74 L74 86 L50 86 Z" fill="#ffffff" opacity="0.92" />
        <path d="M50 44 L74 44 L74 86 L50 86" fill="none" stroke="#d6dce6" strokeWidth="1.5" />
        <rect x="50" y="56" width="24" height="5" fill="#3b82c4" />
        <rect x="50" y="64" width="24" height="2.5" fill="#3b82c4" />
        <path d="M74 56 L90 44 L90 49 L74 61 Z" fill="#2f6aa3" />
        <path d="M28 30 Q30 18 42 20 Q50 22 46 30 Q42 34 38 28" fill="#fff3b0" stroke="#e0b93a" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 50 L13 62" stroke="#fff6cf" strokeWidth="3" strokeLinecap="round" />
        {/* A butter knife stuck in the top. */}
        <path d="M50 38 L60 38" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M51 38 L59 38 L70 16 Q66 12 62 15 Z" fill="#dfe5ee" stroke="#8d98aa" strokeWidth="1.5" />
        <path d="M69 17 L80 -4" stroke="#6b3a24" strokeWidth="7" strokeLinecap="round" />
      </g>
    ),
    face: { x: 31, y: 60, scale: 0.7 },
  },
  pickle: {
    body: () => {
      const outline = 'M36 10 C50 6 60 16 64 32 C69 52 74 70 68 86 C62 98 42 98 36 84 C30 66 26 46 24 30 C22 18 28 12 36 10 Z'
      const warts: [number, number][] = [
        [24, 30], [26, 46], [29, 62], [33, 76], [62, 26], [66, 42], [70, 58], [71, 74], [46, 7], [54, 94],
      ]
      return (
        <g>
          <path d="M40 10 Q38 2 44 0" fill="none" stroke="#3d6e22" strokeWidth="4" strokeLinecap="round" />
          <g fill="#5f9e3a" stroke="#3d6e22" strokeWidth="2">
            {warts.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />
            ))}
          </g>
          <path d={outline} fill="#5f9e3a" stroke="#3d6e22" strokeWidth="2.5" />
          <path d="M34 22 Q36 52 44 84" fill="none" stroke="#86c06a" strokeWidth="4" strokeLinecap="round" />
          <g fill="#a8d88a">
            <circle cx="56" cy="22" r="2" />
            <circle cx="62" cy="64" r="2" />
            <circle cx="40" cy="70" r="1.8" />
            <circle cx="60" cy="82" r="1.8" />
            <circle cx="30" cy="40" r="1.6" />
          </g>
        </g>
      )
    },
    face: { x: 49, y: 46, scale: 0.8 },
  },
  professor: {
    body: () => (
      <g>
        <g fill="#f4f4f8" stroke="#cfcbd8" strokeWidth="1">
          <path d="M14 66 L2 58 L12 52 L0 40 L14 38 L8 24 L22 28 L24 14 L34 22 L40 8 L46 20 L56 6 L60 20 L70 10 L72 24 L86 18 L82 32 L98 36 L86 44 L100 54 L86 58 L96 68 L84 68 Z" />
        </g>
        <circle cx="50" cy="56" r="33" fill="#f2c49b" stroke={RIM} strokeWidth="1.5" />
        <path d="M18 32 L82 32" stroke="#6b3a24" strokeWidth="4" />
        <g fill="#9fdcff" stroke="#6b3a24" strokeWidth="3.5">
          <circle cx="40" cy="30" r="7" />
          <circle cx="60" cy="30" r="7" />
        </g>
        <g stroke="#f4f4f8" strokeWidth="4" strokeLinecap="round">
          <path d="M30 42 L44 40" />
          <path d="M70 42 L56 40" />
        </g>
      </g>
    ),
    face: { x: 50, y: 52, scale: 0.9 },
  },
  kraken: {
    body: () => {
      const arms = [
        'M28 56 Q6 52 6 30 Q6 14 20 14 Q28 16 24 24',
        'M72 56 Q94 52 94 30 Q94 14 80 14 Q72 16 76 24',
        'M30 62 Q10 70 8 84 Q8 96 20 94',
        'M70 62 Q90 70 92 84 Q92 96 80 94',
        'M42 64 Q34 80 42 94',
        'M58 64 Q66 80 58 94',
      ]
      const suckers: [number, number][] = [
        [7, 40], [7, 30], [10, 21], [17, 16], [93, 40], [93, 30], [90, 21], [83, 16],
        [13, 76], [10, 86], [87, 76], [90, 86], [38, 80], [62, 80], [41, 91], [59, 91],
      ]
      return (
        <g>
          <g fill="none" stroke="#1d3e4e" strokeWidth="13" strokeLinecap="round">
            {arms.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g fill="none" stroke="#3d7f9a" strokeWidth="10" strokeLinecap="round">
            {arms.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g fill="#f3c19a" stroke="#b5562a" strokeWidth="1.2">
            {suckers.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" />
            ))}
          </g>
          <path d="M50 0 C75 0 85 18 83 38 C81 52 72 60 64 62 Q50 74 36 62 C28 60 19 52 17 38 C15 18 25 0 50 0 Z" fill="#3d7f9a" stroke="#1d3e4e" strokeWidth="2" />
          <path d="M30 10 Q40 4 50 4" fill="none" stroke="#6fb0c4" strokeWidth="3" strokeLinecap="round" />
          <g fill="#2a5a70">
            <circle cx="66" cy="14" r="2.5" />
            <circle cx="72" cy="24" r="1.8" />
            <circle cx="28" cy="26" r="2" />
            <circle cx="46" cy="56" r="1.2" />
            <circle cx="54" cy="56" r="1.2" />
            <circle cx="50" cy="52" r="1.2" />
          </g>
          <g fill="#ff8a3d">
            <circle cx="37" cy="44" r="10" opacity="0.3" />
            <circle cx="63" cy="44" r="10" opacity="0.3" />
            <circle cx="37" cy="44" r="6.5" />
            <circle cx="63" cy="44" r="6.5" />
          </g>
          <g fill="none" stroke="#1d3e4e" strokeWidth="4.5" strokeLinecap="round">
            <path d="M25 34 Q35 29 46 37" />
            <path d="M75 34 Q65 29 54 37" />
          </g>
        </g>
      )
    },
    face: { x: 50, y: 44, scale: 0.8, gap: 16 },
    darkEyes: true,
    darkMouth: true,
  },
  banana: {
    body: () => (
      <g transform="translate(-11 0)">
        <path d="M34 14 L32 4 Q36 0 41 3 L43 12 Z" fill="#7a5a2a" />
        <path
          d="M34 12 Q36 6 44 8 Q92 22 88 58 Q84 88 44 96 Q35 98 37 90 Q54 80 54 54 Q54 30 34 12 Z"
          fill="#ffd93d"
          stroke="#c9a227"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M44 14 Q78 30 76 58 Q74 80 50 90" fill="none" stroke="#ffeb8a" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 92 Q36 97 37 90 Z" fill="#5e4a2a" stroke="#5e4a2a" strokeWidth="3" strokeLinejoin="round" />
        <g fill="#b8862a">
          <circle cx="80" cy="36" r="1.4" />
          <circle cx="62" cy="84" r="1.2" />
          <circle cx="58" cy="22" r="1.2" />
        </g>
      </g>
    ),
    face: { x: 59, y: 50, scale: 0.65 },
  },
  dart: {
    body: () => (
      <g strokeLinejoin="round" transform="rotate(35 50 50)">
        <path d="M44 78 L56 78 L50 100 Z" fill="#cfd6e0" stroke="#8d98aa" strokeWidth="1.5" />
        <rect x="46" y="16" width="8" height="26" fill="#3a3340" />
        <path d="M50 26 L28 2 L30 26 L50 34 Z" fill="#e63946" stroke="#9c1f2b" strokeWidth="1.5" />
        <path d="M50 26 L72 2 L70 26 L50 34 Z" fill="#e63946" stroke="#9c1f2b" strokeWidth="1.5" />
        <path d="M50 30 L50 4" stroke="#ffd23f" strokeWidth="4" strokeLinecap="round" />
        <rect x="32" y="38" width="36" height="42" rx="14" fill="#b8c2d0" stroke="#6b7689" strokeWidth="1.5" />
        <g stroke="#8d98aa" strokeWidth="1.5">
          <path d="M34 72 L66 72" />
          <path d="M35 76 L65 76" />
        </g>
        <path d="M37 44 L37 66" stroke="#e8edf4" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
    face: { x: 45, y: 52, scale: 0.6 },
  },
  cone: {
    body: () => (
      <g strokeLinejoin="round">
        <rect x="8" y="82" width="84" height="12" rx="3" fill="#d9531e" stroke={RIM} strokeWidth="1.5" />
        <path d="M43 4 L57 4 L80 84 L20 84 Z" fill="#ff7a2f" stroke={RIM} strokeWidth="1.5" />
        <path d="M40 16 L60 16 L62.6 26 L37.4 26 Z" fill="#ffffff" />
        <path d="M30.3 66 L69.7 66 L72.6 76 L27.4 76 Z" fill="#ffffff" />
      </g>
    ),
    face: { x: 50, y: 42, scale: 0.6 },
  },
  duck: {
    body: () => (
      <g>
        <ellipse cx="54" cy="74" rx="40" ry="22" fill="#ffd93d" stroke="#d9a90f" strokeWidth="1.5" />
        <path d="M86 66 Q98 58 94 72 Z" fill="#ffd93d" stroke="#d9a90f" strokeWidth="1.5" />
        <path d="M54 72 Q70 66 78 78 Q64 84 54 72 Z" fill="#f2c21f" />
        <circle cx="46" cy="40" r="27" fill="#ffd93d" stroke="#d9a90f" strokeWidth="1.5" />
        <path d="M44 14 Q46 4 54 6 Q48 8 50 14" fill="#ffd93d" stroke="#d9a90f" strokeWidth="1.5" />
      </g>
    ),
    front: () => (
      <g>
        <ellipse cx="46" cy="54" rx="13" ry="5.5" fill="#ff8c1a" stroke="#d96a00" strokeWidth="1.2" />
        <path d="M34 54 Q46 57 58 54" fill="none" stroke="#d96a00" strokeWidth="1.2" />
      </g>
    ),
    face: { x: 46, y: 40, scale: 0.85 },
    noMouth: true,
  },
  disco: {
    body: () => {
      const r = 38
      const steps = [-28.5, -19, -9.5, 0, 9.5, 19, 28.5]
      return (
        <g>
          <path d="M50 0 L50 14" stroke="#cfcbd8" strokeWidth="2" />
          <circle cx="50" cy="52" r={r} fill="#aab4c4" stroke="#6b7689" strokeWidth="1.5" />
          <g stroke="#7f8a9c" strokeWidth="1.2">
            {steps.map((d) => {
              const h = Math.sqrt(r * r - d * d)
              return (
                <g key={d}>
                  <path d={`M${50 - h} ${52 + d} L${50 + h} ${52 + d}`} />
                  <path d={`M${50 + d} ${52 - h} L${50 + d} ${52 + h}`} />
                </g>
              )
            })}
          </g>
          <g fill="#eef2f8">
            <rect x="31" y="24" width="9.5" height="9.5" />
            <rect x="59.5" y="33.5" width="9.5" height="9.5" />
            <rect x="21.5" y="61.5" width="9.5" height="9.5" />
            <rect x="69" y="71" width="9.5" height="9.5" />
          </g>
          <g fill="#c9b8ff">
            <rect x="40.5" y="24" width="9.5" height="9.5" />
            <rect x="69" y="52" width="9.5" height="9.5" />
          </g>
          <g fill="#ffffff">
            <path d="M14 22 L16 28 L22 30 L16 32 L14 38 L12 32 L6 30 L12 28 Z" />
            <path d="M86 14 L87.5 18.5 L92 20 L87.5 21.5 L86 26 L84.5 21.5 L80 20 L84.5 18.5 Z" />
          </g>
        </g>
      )
    },
    face: { x: 50, y: 50, scale: 0.85 },
  },
  frikandel: {
    body: () => (
      <g strokeLinejoin="round">
        <path d="M14 62 L86 62 L80 96 L20 96 Z" fill="#ffffff" stroke="#cfcbd8" strokeWidth="1.5" />
        <g transform="rotate(-14 50 52)">
          <rect x="-2" y="37" width="104" height="35" rx="17.5" fill="#a8643a" stroke="#5e341b" strokeWidth="1.5" />
          <g stroke="#8a4c28" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 54 L8 60" />
            <path d="M92 52 L94 58" />
          </g>
          <path d="M2 42 Q8 33 16 40 Q24 33 32 40 Q40 33 48 40 Q56 33 64 40 Q72 33 80 40 Q88 33 98 42 Q90 46 50 45 Q10 46 2 42 Z" fill="#fff6e0" />
          <path d="M8 44 Q16 38 24 44 Q32 38 40 44 Q48 38 56 44 Q64 38 72 44 Q80 38 92 44 Q80 48 50 47 Q20 48 8 44 Z" fill="#e85a2a" />
          <g fill="#f4f0ff">
            <rect x="12" y="38" width="3.5" height="3.5" rx="0.8" />
            <rect x="34" y="36" width="3.5" height="3.5" rx="0.8" />
            <rect x="60" y="38" width="3.5" height="3.5" rx="0.8" />
            <rect x="82" y="36" width="3.5" height="3.5" rx="0.8" />
          </g>
        </g>
        <path d="M16 76 L84 76 L80 96 L20 96 Z" fill="#ffffff" stroke="#cfcbd8" strokeWidth="1.5" />
        <g fill="#e63946">
          <path d="M24 76 L32 76 L32 96 L25 96 Z" />
          <path d="M42 76 L50 76 L50 96 L42 96 Z" />
          <path d="M60 76 L68 76 L68 96 L60 96 Z" />
          <path d="M78 76 L84 76 L80 96 L78 96 Z" />
        </g>
      </g>
    ),
    face: { x: 50, y: 57, scale: 0.5 },
    darkMouth: true,
  },
  toiletroll: {
    body: () => (
      <g>
        <path d="M80 30 L80 76 Q86 84 82 96 L70 96 Q74 86 72 80" fill="#ffffff" stroke="#cfcbd8" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M18 24 L18 82 Q18 92 50 92 Q82 92 82 82 L82 24 Z" fill="#f7f5fb" stroke="#cfcbd8" strokeWidth="1.5" />
        <ellipse cx="50" cy="24" rx="32" ry="10" fill="#ffffff" stroke="#cfcbd8" strokeWidth="1.5" />
        <ellipse cx="50" cy="24" rx="11" ry="4" fill="#c9a77a" stroke="#9c7a4a" strokeWidth="1.5" />
        <g stroke="#e4e0ec" strokeWidth="1.5" strokeDasharray="2 3">
          <path d="M22 44 Q50 50 78 44" fill="none" />
          <path d="M22 80 Q50 86 78 80" fill="none" />
        </g>
      </g>
    ),
    face: { x: 49, y: 54, scale: 0.75 },
  },
  shot: {
    body: () => (
      <g strokeLinejoin="round">
        <path d="M14 22 L86 22 L80 94 L20 94 Z" fill="#e6f4fb" stroke="#9fc4d8" strokeWidth="2" />
        <path d="M18 34 L82 34 L78.6 76 L21.4 76 Z" fill="#f2a93b" />
        <ellipse cx="50" cy="34" rx="32" ry="3" fill="#f7c46a" />
        <path d="M21.4 76 L78.6 76 L80 94 L20 94 Z" fill="#c4e2f2" />
        <path d="M20 28 L25 72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 22 L92 4 A22 22 0 0 1 74 34 Z" fill="#8bd346" stroke="#4f9a2f" strokeWidth="2" />
        <path d="M64 22 L88 9 A17 17 0 0 1 74 29 Z" fill="#d6f5a8" />
      </g>
    ),
    face: { x: 50, y: 50, scale: 0.75 },
  },
  sock: {
    body: () => (
      <g strokeLinejoin="round">
        <path
          d="M28 6 L68 6 L68 54 Q68 62 76 66 L88 72 Q100 82 92 92 Q86 98 74 96 L38 88 Q24 84 26 68 Z"
          fill="#f7f5fb"
          stroke="#cfcbd8"
          strokeWidth="1.5"
        />
        <rect x="28" y="6" width="40" height="8" fill="#e63946" />
        <rect x="28" y="17" width="40" height="4" fill="#3b82c4" />
        <path d="M76 66 L88 72 Q100 82 92 92 Q86 98 78 96 Q86 82 76 66 Z" fill="#e63946" />
        <path d="M26 72 Q28 86 40 88 L48 90 Q36 82 36 70 Z" fill="#e63946" />
      </g>
    ),
    face: { x: 48, y: 40, scale: 0.75 },
  },
  robot: {
    body: () => (
      <g>
        <path d="M50 22 L50 8" stroke="#6b7689" strokeWidth="3" />
        <circle cx="50" cy="7" r="5" fill="#e63946" />
        <rect x="6" y="44" width="10" height="20" rx="3" fill="#6b7689" />
        <rect x="84" y="44" width="10" height="20" rx="3" fill="#6b7689" />
        <rect x="14" y="20" width="72" height="70" rx="12" fill="#9aa8bd" stroke="#5a6578" strokeWidth="2" />
        <rect x="22" y="34" width="56" height="46" rx="8" fill="#24324a" />
        <g fill="#5a6578">
          <circle cx="21" cy="27" r="2" />
          <circle cx="79" cy="27" r="2" />
          <circle cx="21" cy="85" r="2" />
          <circle cx="79" cy="85" r="2" />
        </g>
      </g>
    ),
    face: { x: 50, y: 50, scale: 0.85 },
    darkEyes: true,
    darkMouth: true,
  },
  trophy: {
    body: () => (
      <g strokeLinejoin="round">
        <path d="M24 18 Q4 18 8 34 Q12 46 28 48" fill="none" stroke="#e0a21a" strokeWidth="5" />
        <path d="M76 18 Q96 18 92 34 Q88 46 72 48" fill="none" stroke="#e0a21a" strokeWidth="5" />
        <rect x="44" y="60" width="12" height="16" fill="#e0a21a" />
        <rect x="22" y="80" width="56" height="16" rx="3" fill="#6b3a24" />
        <rect x="34" y="84" width="32" height="8" rx="1.5" fill="#ffd23f" />
        <path d="M32 76 L68 76 L72 82 L28 82 Z" fill="#e0a21a" />
        <path d="M20 8 L80 8 Q80 56 50 64 Q20 56 20 8 Z" fill="#ffd23f" stroke="#c98a0e" strokeWidth="2" />
        <path d="M28 14 Q28 40 40 52" fill="none" stroke="#fff3b0" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    ),
    face: { x: 50, y: 28, scale: 0.7 },
  },
}

export function Avatar(props: {
  avatar: string
  mood?: Mood
  size?: number | string
  /** Blackened by a bomb. */
  scorched?: boolean
}): React.JSX.Element {
  const id: AvatarId = isAvatar(props.avatar) ? props.avatar : 'fox'
  const mood = props.mood ?? 'idle'
  const scorched = props.scorched === true

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={props.size ?? '100%'}
      height={props.size ?? '100%'}
      animate={MOTION[mood]}
      style={{ overflow: 'visible', display: 'block', flex: 'none' }}
      aria-hidden
    >
      {id in CHARACTERS ? (
        <CharacterParts character={CHARACTERS[id as keyof typeof CHARACTERS]} mood={mood} scorched={scorched} />
      ) : (
        <AnimalParts spec={SPECS[id as AnimalId]} panda={id === 'panda'} mood={mood} scorched={scorched} />
      )}
      {scorched && <Soot />}
      <MoodMarks mood={mood} />
    </motion.svg>
  )
}

function CharacterParts({ character, mood, scorched }: { character: Character; mood: Mood; scorched: boolean }): React.JSX.Element {
  const { x, y, scale = 1, gap } = character.face
  const lightMouth = scorched || character.darkMouth === true
  return (
    <>
      <g style={scorched ? { filter: 'brightness(0.24) saturate(0.35)' } : undefined}>{character.body()}</g>
      <g transform={`translate(${x} ${y}) scale(${scale}) translate(-50 -50)`}>
        <Eyes mood={mood} frog={false} onDark={scorched || character.darkEyes === true} gap={gap} />
        {!character.noMouth && <Mouth mood={mood} y={72} ink={lightMouth ? '#ffffff' : undefined} />}
      </g>
      {character.front && (
        <g style={scorched ? { filter: 'brightness(0.24) saturate(0.35)' } : undefined}>{character.front()}</g>
      )}
    </>
  )
}

function AnimalParts({ spec, panda, mood, scorched }: { spec: Spec; panda: boolean; mood: Mood; scorched: boolean }): React.JSX.Element {
  const frog = spec.ears === 'bumps'
  const dark = panda || scorched
  const mouthY = spec.nose === 'pig' ? 80 : 72
  return (
    <>
      <g style={scorched ? { filter: 'brightness(0.24) saturate(0.35)' } : undefined}>
        {Extras(spec, true)}
        {EarShapes(spec)}
        <circle cx="50" cy="54" r="35" fill={spec.fur} stroke="rgb(0 0 0 / 12%)" strokeWidth="1.5" />
        {spec.face === 'mask' && <ellipse cx="50" cy="60" rx="25" ry="24" fill={spec.light} />}
        {spec.face === 'muzzle' && <ellipse cx="50" cy="69" rx="17" ry="13" fill={spec.light} />}
        {Extras(spec, false)}
      </g>
      <Eyes mood={mood} frog={frog} onDark={dark} />
      {spec.nose === 'nose' && <ellipse cx="50" cy="63" rx="5" ry="3.6" fill={INK} />}
      {spec.nose === 'pig' && (
        <>
          <ellipse cx="50" cy="66" rx="12" ry="8.5" fill={spec.light} />
          <ellipse cx="46" cy="66" rx="2" ry="3" fill={INK} />
          <ellipse cx="54" cy="66" rx="2" ry="3" fill={INK} />
        </>
      )}
      {spec.nose === 'beak' && <path d="M43 59 L57 59 L50 71 Z" fill="#f59e0b" />}
      {spec.nose === 'trunk' && (
        <path d="M43 58 Q42 84 50 92 Q58 84 57 58 Z" fill={spec.fur} stroke="rgb(0 0 0 / 18%)" strokeWidth="1.5" />
      )}
      {spec.nose !== 'beak' && spec.nose !== 'trunk' && (
        <Mouth mood={mood} y={frog ? 66 : mouthY} ink={scorched ? '#ffffff' : undefined} />
      )}
    </>
  )
}
