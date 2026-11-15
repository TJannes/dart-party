import { motion } from 'motion/react'

// The things the default theme puts in a game's scene: the bomb, the pig,
// the boxing glove. Drawn here so the scene and the animations over it show
// the same thing.

const INK = '#1b0a38'

const mix = (from: number[], to: number[], t: number): string =>
  `rgb(${from.map((value, i) => Math.round(value + (to[i]! - value) * t)).join(' ')})`

/** How hot a bomb looks after this many burned darts, 0 to 1. */
export const heatOf = (burned: number): number => Math.min(1, burned / 9)

/** How much bigger a bomb is drawn after this many burned darts. */
export const swellOf = (burned: number): number => 1 + heatOf(burned) * 0.8

/**
 * A round bomb with a sparking fuse. It only shows how much has burned: the
 * fuse itself never gets shorter, because how much is left is a secret.
 */
export function Bomb({ burned = 0, lit = true }: { burned?: number; lit?: boolean }): React.JSX.Element {
  const heat = heatOf(burned)
  return (
    <svg viewBox="-50 -50 100 100" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path d="M0 -24 Q4 -40 20 -38" fill="none" stroke="#c9a56b" strokeWidth="5" strokeLinecap="round" />
      <rect x="-9" y="-30" width="18" height="12" rx="3" fill="#4b4560" stroke={INK} strokeWidth="2" />
      <circle cx="0" cy="10" r="32" fill={mix([42, 36, 56], [226, 44, 62], heat)} stroke={INK} strokeWidth="2.5" />
      <path d="M-20 0 A22 22 0 0 1 -4 -16" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
      {lit && (
        <motion.g
          style={{ x: 21, y: -39 }}
          animate={{ scale: [0.7, 1.25 + heat * 0.7, 0.7], rotate: [0, 40, 0] }}
          transition={{ duration: 0.34 - heat * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M0 -12 L3 -4 L11 -6 L5 0 L11 6 L3 4 L0 12 L-3 4 L-11 6 L-5 0 L-11 -6 L-3 -4 Z" fill="#ffd23f" stroke="#f08a4b" strokeWidth="1.5" />
          <circle r="3" fill="#fff" />
        </motion.g>
      )}
    </svg>
  )
}

export type PigFace = 'plain' | 'grin' | 'grumpy'

/** Where the plasters go, one per time the pig was broken. */
const PLASTERS = [
  { x: -20, y: -14, turn: -35 },
  { x: 4, y: 18, turn: 30 },
  { x: -34, y: 12, turn: 70 },
  { x: 16, y: -20, turn: 10 },
]

/**
 * A piggy bank in a player's colour with the total on its side. It grows
 * fatter as it fills, and keeps a plaster for every time it was broken.
 */
export function Pig(props: { colour: string; total: number; breaks: number; face: PigFace }): React.JSX.Element {
  const fat = Math.min(1, props.total / 300)
  const rx = 42 + fat * 14
  const ry = 30 + fat * 10
  const snout = rx - 4
  return (
    <svg viewBox="-80 -55 160 110" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path d={`M${-rx} 0 q-12 -4 -9 -13 q4 -8 9 -1`} fill="none" stroke={props.colour} strokeWidth="4" strokeLinecap="round" />
      {[-24, 22].map((x) => (
        <rect key={x} x={x - 6} y={ry - 6} width="13" height="16" rx="4" fill={props.colour} stroke={INK} strokeWidth="2" />
      ))}
      <path d={`M${snout - 30} ${-ry + 6} l4 -17 l15 12 Z`} fill={props.colour} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <motion.ellipse cx="0" cy="0" initial={false} animate={{ rx, ry }} fill={props.colour} stroke={INK} strokeWidth="2.5" />
      <rect x="-13" y={-ry - 1.5} width="26" height="5" rx="2.5" fill={INK} />
      <ellipse cx={snout} cy="2" rx="11" ry="9" fill="#fff" fillOpacity="0.45" stroke={INK} strokeWidth="2" />
      <ellipse cx={snout - 3} cy="2" rx="1.8" ry="3" fill={INK} />
      <ellipse cx={snout + 4} cy="2" rx="1.8" ry="3" fill={INK} />
      {props.face === 'grin' ? (
        <path d={`M${snout - 24} -13 q4 -6 8 0`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <circle cx={snout - 20} cy="-12" r="3.4" fill={INK} />
      )}
      {props.face === 'grumpy' && (
        <path d={`M${snout - 27} -21 l12 5`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      )}
      <path
        d={
          props.face === 'grin'
            ? `M${snout - 22} 13 q8 9 16 2`
            : props.face === 'grumpy'
              ? `M${snout - 22} 17 q8 -7 15 -2`
              : `M${snout - 20} 15 q7 3 13 0`
        }
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {PLASTERS.slice(0, props.breaks).map((at) => (
        <g key={at.x} transform={`translate(${at.x} ${at.y}) rotate(${at.turn})`}>
          <rect x="-11" y="-4" width="22" height="8" rx="4" fill="#f6d7b0" stroke="#b98a5a" strokeWidth="1" />
          <rect x="-4" y="-4" width="8" height="8" fill="#e9bd8c" />
        </g>
      ))}
      <text
        x="-8"
        y="3"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="30"
        fontWeight="900"
        fill="#fff"
        stroke={INK}
        strokeWidth="5"
        paintOrder="stroke fill"
      >
        {props.total}
      </text>
    </svg>
  )
}

/** The big arrow of Higher or Lower. */
export function CallArrow({ call, colour = '#ffd23f' }: { call: 'higher' | 'lower'; colour?: string }): React.JSX.Element {
  return (
    <svg viewBox="-20 -24 40 48" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path
        d="M0 -22 L18 0 L8 0 L8 22 L-8 22 L-8 0 L-18 0 Z"
        transform={call === 'lower' ? 'rotate(180)' : undefined}
        fill={colour}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The pot of Raise the Bar, with what is in it. */
export function Pot({ coins }: { coins: number }): React.JSX.Element {
  return (
    <svg viewBox="-30 -30 60 60" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <ellipse cx="0" cy="-12" rx="20" ry="6" fill="#ffd23f" stroke="#b8860b" strokeWidth="2" />
      <path d="M-24 -12 Q-30 26 0 26 Q30 26 24 -12 Z" fill="#4b4560" stroke={INK} strokeWidth="2.5" />
      <path d="M-26 -12 H26" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <text y="9" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="900" fill="#ffd23f" stroke={INK} strokeWidth="4" paintOrder="stroke fill">
        {coins}
      </text>
    </svg>
  )
}

/** A boxing glove, fist to the right. */
export function Glove({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="-30 -26 60 52" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <rect x="-28" y="-11" width="16" height="22" rx="3" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M-14 -16 Q-14 -24 2 -24 Q28 -24 28 0 Q28 22 4 22 Q-14 22 -14 14 Z" fill={colour} stroke={INK} strokeWidth="2.5" />
      <path d="M-6 -24 Q-10 -10 4 -8 Q14 -8 12 -18" fill={colour} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 -14 Q20 -8 20 4" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
