import { motion, type TargetAndTransition } from 'motion/react'
import type { AvatarId } from '../../../core/players'
import { isAvatar } from '../../../core/players'

// The twenty characters, drawn from a handful of parts so each can show a
// mood. A new character is one line in SPECS.

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

const SPECS: Record<AvatarId, Spec> = {
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

function Eyes({ mood, frog, onDark }: { mood: Mood; frog: boolean; onDark: boolean }): React.JSX.Element {
  const y = frog ? 28 : 50
  const [left, right] = frog ? [33, 67] : [38, 62]
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

function Mouth({ mood, y }: { mood: Mood; y: number }): React.JSX.Element {
  if (mood === 'cheer') return <path d={`M42 ${y - 2} Q50 ${y + 13} 58 ${y - 2} Z`} fill="#8c1c3a" />
  if (mood === 'laugh') {
    return (
      <g>
        <path d={`M39 ${y - 3} Q50 ${y + 19} 61 ${y - 3} Z`} fill="#8c1c3a" />
        <path d={`M45 ${y + 6} Q50 ${y + 2} 55 ${y + 6} Q50 ${y + 12} 45 ${y + 6} Z`} fill="#ff8fab" />
      </g>
    )
  }
  if (mood === 'shocked') return <ellipse cx="50" cy={y + 3} rx="4.5" ry="6" fill="#8c1c3a" />
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

export function Avatar(props: { avatar: string; mood?: Mood; size?: number | string }): React.JSX.Element {
  const id: AvatarId = isAvatar(props.avatar) ? props.avatar : 'fox'
  const spec = SPECS[id]
  const mood = props.mood ?? 'idle'
  const frog = spec.ears === 'bumps'
  const dark = id === 'panda'
  const mouthY = spec.nose === 'pig' ? 80 : 72

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={props.size ?? '100%'}
      height={props.size ?? '100%'}
      animate={MOTION[mood]}
      style={{ overflow: 'visible', display: 'block', flex: 'none' }}
      aria-hidden
    >
      {Extras(spec, true)}
      {EarShapes(spec)}
      <circle cx="50" cy="54" r="35" fill={spec.fur} stroke="rgb(0 0 0 / 12%)" strokeWidth="1.5" />
      {spec.face === 'mask' && <ellipse cx="50" cy="60" rx="25" ry="24" fill={spec.light} />}
      {spec.face === 'muzzle' && <ellipse cx="50" cy="69" rx="17" ry="13" fill={spec.light} />}
      {Extras(spec, false)}
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
      {spec.nose !== 'beak' && spec.nose !== 'trunk' && <Mouth mood={mood} y={frog ? 66 : mouthY} />}
      <MoodMarks mood={mood} />
    </motion.svg>
  )
}
