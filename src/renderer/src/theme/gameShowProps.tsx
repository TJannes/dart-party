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

const SUITS = ['♠', '♥', '♣', '♦']

/**
 * A playing card of Blackjack: what a dart added to the hand. The suit only
 * tells the cards apart. Without a value it lies face down: a dart off the
 * board, or the deck.
 */
export function Card({ value, suit = 0 }: { value?: number; suit?: number }): React.JSX.Element {
  const red = suit % 2 === 1
  const ink = red ? '#d7263d' : INK
  const text = value === 11 ? 'A' : String(value)
  return (
    <svg viewBox="0 0 50 70" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {value === undefined || value === 0 ? (
        <>
          <rect x="1.5" y="1.5" width="47" height="67" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <rect x="6" y="6" width="38" height="58" rx="3.5" fill="#6d4fb3" />
          <path d="M25 14 L39 35 L25 56 L11 35 Z" fill="none" stroke="#ffd23f" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="25" cy="35" r="4.5" fill="#ffd23f" />
        </>
      ) : (
        <>
          <rect x="1.5" y="1.5" width="47" height="67" rx="6" fill="#fffdf6" stroke={INK} strokeWidth="2.5" />
          <text x="25" y="38" textAnchor="middle" dominantBaseline="middle" fontSize={text.length > 1 ? 27 : 32} fontWeight="900" fill={ink}>
            {text}
          </text>
          <text x="9" y="15" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill={ink}>
            {SUITS[suit % 4]}
          </text>
          <text x="41" y="57" textAnchor="middle" dominantBaseline="middle" fontSize="13" fill={ink} transform="rotate(180 41 57)">
            {SUITS[suit % 4]}
          </text>
        </>
      )}
    </svg>
  )
}

/** How the five pictures of Memory look: a sign and a colour each. */
export const MEMORY_PICTURES = {
  star: { sign: '★', colour: '#ffd23f' },
  heart: { sign: '♥', colour: '#ee4266' },
  clover: { sign: '♣', colour: '#3bceac' },
  diamond: { sign: '◆', colour: '#7fd4ff' },
  triangle: { sign: '▲', colour: '#f08a4b' },
} as const

/** A card of Memory, face up. */
export function MemoryCard({ picture }: { picture: keyof typeof MEMORY_PICTURES }): React.JSX.Element {
  const { sign, colour } = MEMORY_PICTURES[picture]
  return (
    <svg viewBox="0 0 50 60" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <rect x="1.5" y="1.5" width="47" height="57" rx="7" fill={colour} stroke={INK} strokeWidth="3" />
      <rect x="7" y="7" width="36" height="46" rx="4" fill="#fffdf6" />
      <text x="25" y="32" textAnchor="middle" dominantBaseline="middle" fontSize="30" fontWeight="900" fill={INK}>
        {sign}
      </text>
    </svg>
  )
}

/** A burning torch on the wall of the temple in Trap Runner: a rest stop. */
export function Torch(): React.JSX.Element {
  return (
    <svg viewBox="-10 -30 20 44" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <circle cy="-16" r="15" fill="#ffb347" opacity="0.22" />
      <path d="M-2.2 -6 L2.2 -6 L1.4 13 L-1.4 13 Z" fill="#8a5a33" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-4.5 -8 H4.5 L3 -3 H-3 Z" fill="#4b4560" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <g className="torch__flame">
        <path d="M0 -27 Q7 -17 4.5 -9 Q0 -6 -4.5 -9 Q-7 -17 0 -27 Z" fill="#f08a4b" stroke="#ee4266" strokeWidth="1" />
        <path d="M0 -20 Q3.5 -14 2 -10 Q0 -8.5 -2 -10 Q-3.5 -14 0 -20 Z" fill="#ffd23f" />
      </g>
    </svg>
  )
}

/** The way out of the temple in Trap Runner: a stone arch with daylight and jungle behind it. */
export function CaveExit(): React.JSX.Element {
  return (
    <svg viewBox="0 0 44 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id="cave-exit-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd4ff" />
          <stop offset="0.7" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#ffd23f" />
        </linearGradient>
      </defs>
      {/* The light that falls into the corridor. */}
      <path d="M8 58 L-12 59 L-12 28 L8 18 Z" fill="#fff3b0" opacity="0.16" />
      <path d="M6 58 V24 Q6 4 22 4 Q38 4 38 24 V58 Z" fill="url(#cave-exit-sky)" />
      <circle cx="26" cy="20" r="6" fill="#fff" opacity="0.9" />
      {/* Jungle outside. */}
      <path d="M6 58 V46 Q12 38 17 46 Q22 36 28 45 Q33 38 38 44 V58 Z" fill="#2f9e6b" />
      <path d="M6 58 V51 Q14 45 20 52 Q27 46 38 51 V58 Z" fill="#14613f" />
      {/* The stones of the arch. */}
      <path
        d="M0 60 V22 Q0 -2 22 -2 Q44 -2 44 22 V60 H38 V24 Q38 4 22 4 Q6 4 6 24 V60 Z"
        fill="#6b5a4e"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M0 40 H6 M0 26 H6 M38 40 H44 M38 26 H44 M3 12 L8 15 M41 12 L36 15 M13 1 L15 6 M31 1 L29 6 M22 -2 V4" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      {/* Vines over the top. */}
      <path d="M4 6 Q8 14 5 22 M12 0 Q15 9 12 15 M36 2 Q33 10 37 18" fill="none" stroke="#2f9e6b" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 22 l-3 2 M12 15 l3 2 M37 18 l3 1 M8 12 l3 -1" stroke="#3bceac" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

/** The treasure chamber where the runners of Trap Runner start: a golden idol in a niche. */
export function Idol(): React.JSX.Element {
  return (
    <svg viewBox="0 0 40 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {/* The niche in the wall. */}
      <path d="M4 60 V22 Q4 6 20 6 Q36 6 36 22 V60 Z" fill="#1b1220" stroke="#6b5a4e" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="20" cy="30" r="15" fill="#ffd23f" opacity="0.2" />
      {/* The pedestal. */}
      <path d="M11 60 V50 H29 V60 Z M8 50 H32 V46 H8 Z" fill="#8b7a6b" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* The idol: a squat golden figure with a big head. */}
      <path d="M14 46 Q12 38 16 35 H24 Q28 38 26 46 Z" fill="#e0a90f" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="12" y="20" width="16" height="16" rx="4" fill="#ffd23f" stroke={INK} strokeWidth="1.4" />
      <path d="M15.5 26 h3 M21.5 26 h3" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 31 h7" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 20 l2 -4 l2 4 M22 20 l2 -4 l2 4" fill="#ffd23f" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path className="idol__glint" d="M31 14 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 Z" fill="#fff" />
    </svg>
  )
}

/** The boulder that rolls after whoever is last in Trap Runner. Only for show. */
export function Boulder(): React.JSX.Element {
  return (
    <svg viewBox="-22 -22 44 44" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <g className="boulder__rock">
        <path
          d="M-3 -20 Q10 -22 17 -11 Q23 0 16 12 Q8 21 -5 20 Q-17 17 -20 4 Q-22 -10 -3 -20 Z"
          fill="#7d6f66"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M-12 -8 Q-4 -15 6 -13" fill="none" stroke="#a89a8e" strokeWidth="3" strokeLinecap="round" />
        <path d="M2 -4 l5 5 l-3 6 M-11 6 l5 -2 l2 6 M9 9 l4 -4" fill="none" stroke="#4b4038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="-6" cy="-2" r="2" fill="#4b4038" />
      </g>
    </svg>
  )
}

/** A racing car for Race, nose to the right; the driver's head goes over the cockpit. */
export function RaceCar({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 88 36" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {/* Rear wing. */}
      <path d="M4 6 H16 V10 H12 V18 H8 V10 H4 Z" fill={INK} />
      <path d="M2 4 H18 V8 H2 Z" fill={colour} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Body: low and long, with a pointed nose. */}
      <path d="M8 26 Q8 16 22 15 H52 Q70 16 84 24 Q86 27 82 28 H10 Q8 28 8 26 Z" fill={colour} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 15 Q36 8 48 15 Z" fill={INK} opacity="0.55" />
      <path d="M52 19 H70 M56 23 H76" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      {/* Front wing. */}
      <path d="M76 28 H88 V31 H76 Z" fill={INK} />
      {[22, 66].map((x) => (
        <g key={x} className="car__wheel" style={{ transformOrigin: `${x}px 28px` }}>
          <circle cx={x} cy="28" r="7.5" fill="#1b1b22" stroke={INK} strokeWidth="1.6" />
          <circle cx={x} cy="28" r="3" fill="#c9c6d6" />
          <path d={`M${x} 21.5 V24 M${x} 32 V34.5`} stroke="#c9c6d6" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

/** What the second to last in Race rides: a bicycle. The rider's head goes over the saddle. */
export function Bicycle({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 88 36" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {[22, 64].map((x) => (
        <g key={x} className="car__wheel" style={{ transformOrigin: `${x}px 26px` }}>
          <circle cx={x} cy="26" r="8.5" fill="none" stroke={INK} strokeWidth="2.6" />
          <path d={`M${x} 17.5 V34.5 M${x - 8.5} 26 H${x + 8.5}`} stroke="#c9c6d6" strokeWidth="1" />
        </g>
      ))}
      {/* Frame, fork, saddle and handlebar. */}
      <path d="M22 26 L36 13 L56 13 L42 26 Z M36 13 L42 26 M56 13 L64 26" fill="none" stroke={colour} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M31 12 H41" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M56 13 L55 6 H62" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* The rider: a back bent to the handlebar and a leg on the pedal. */}
      <path d="M37 12 Q42 2 58 6" fill="none" stroke={colour} strokeWidth="4.5" strokeLinecap="round" />
      <g className="bike__leg">
        <path d="M37 13 L46 20 L42 28" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 28 H46" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle cx="42" cy="26" r="2.4" fill="#c9c6d6" stroke={INK} strokeWidth="1" />
    </svg>
  )
}

/** What the last in Race rides: a kick scooter. A joke, nothing more. */
export function Scooter({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 88 36" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {/* Deck, stem and handlebar. */}
      <path d="M24 30 H58 L54 4" fill="none" stroke="#c9c6d6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 4 H60" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M20 30 Q22 24 28 26" fill="none" stroke="#c9c6d6" strokeWidth="2.6" strokeLinecap="round" />
      {[22, 60].map((x) => (
        <g key={x} className="car__wheel" style={{ transformOrigin: `${x}px 31px` }}>
          <circle cx={x} cy="31" r="4.2" fill="#1b1b22" stroke={INK} strokeWidth="1.4" />
          <path d={`M${x} 27.5 V34.5`} stroke="#c9c6d6" strokeWidth="1.2" />
        </g>
      ))}
      {/* The rider stands on one leg, arms to the handlebar, and pushes off with the other. */}
      <path d="M38 14 V28" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path className="scooter__kick" d="M38 20 L30 30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M38 12 V22" stroke={colour} strokeWidth="7" strokeLinecap="round" />
      <path d="M39 13 L52 6" stroke={colour} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

/** A coat of arms in a player's colour, for Land Grab. */
export function Shield({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 40 46" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path d="M4 4 H36 V22 Q36 36 20 43 Q4 36 4 22 Z" fill={colour} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 4 V43 M4 20 H36" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" />
      {/* A little tower in the middle. */}
      <path d="M14 30 V18 H16 V21 H18.5 V18 H21.5 V21 H24 V18 H26 V30 Z" fill="#fffdf6" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

/** A quiver with three arrows, for the archers of Robin Hood. */
export function Quiver({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 34 50" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {[9, 16, 23].map((x, n) => (
        <g key={x} transform={`rotate(${(n - 1) * 9} ${x} 30)`}>
          <path d={`M${x} 22 V5`} stroke="#b98a5a" strokeWidth="2" strokeLinecap="round" />
          <path d={`M${x} 2 l-3.5 6 h7 Z`} fill={colour} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      ))}
      <path d="M6 20 H27 L24 46 Q16.5 50 9 46 Z" fill="#8a5a33" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 20 H27 L26.4 26 H6.6 Z" fill={colour} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M27 22 Q36 30 25 42" fill="none" stroke="#5c3b1e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** A catapult for Land Grab, aimed to the right: its arm lies back until `fire`, then swings over. */
export function Catapult({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 60 48" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path d="M8 40 H52" stroke="#8a5a33" strokeWidth="5" strokeLinecap="round" />
      <path d="M36 40 L30 16 L22 40" fill="none" stroke="#8a5a33" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M26 30 H34" stroke="#5c3b1e" strokeWidth="3" strokeLinecap="round" />
      <g className="catapult__arm">
        <path d="M30 18 L6 10" stroke="#b98a5a" strokeWidth="4" strokeLinecap="round" />
        <path d="M2 4 Q6 14 12 8" fill="none" stroke="#5c3b1e" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="30" cy="17" r="3.2" fill={colour} stroke={INK} strokeWidth="1.4" />
      {[14, 46].map((x) => (
        <g key={x}>
          <circle cx={x} cy="42" r="5.5" fill="#5c3b1e" stroke={INK} strokeWidth="1.6" />
          <circle cx={x} cy="42" r="1.6" fill="#b98a5a" />
        </g>
      ))}
    </svg>
  )
}

/**
 * What stands in the sand below the rows of Minefield: a palm and a deck
 * chair on one side, a parasol and a deck chair on the other.
 */
export function BeachCorner({ side }: { side: 'left' | 'right' }): React.JSX.Element {
  const chair = (
    <g>
      <path d="M0 30 L26 4 M4 4 L30 30" stroke="#8a5a33" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4 5 Q10 22 28 27" fill="none" stroke="#ee4266" strokeWidth="6" strokeLinecap="round" />
      <path d="M4 5 Q10 22 28 27" fill="none" stroke="#fff8ee" strokeWidth="6" strokeLinecap="butt" strokeDasharray="4 4" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 50" width="100%" height="100%" preserveAspectRatio={side === 'left' ? 'xMinYMax meet' : 'xMaxYMax meet'} style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {side === 'left' ? (
        <>
          <g transform="translate(20 48)">
            <Palm scale={1.35} />
          </g>
          <g transform="translate(52 16)">{chair}</g>
        </>
      ) : (
        <>
          <g transform="translate(20 16)">{chair}</g>
          {/* A parasol, and a ball left in the sand. */}
          <g transform="translate(0 -18)">
            <path d="M84 66 L88 16" stroke="#8a5a33" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M58 26 Q88 -8 118 22 Q108 18 103 21 Q96 16 88 20 Q80 15 73 21 Q66 19 58 26 Z" fill="#ffd23f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M73 21 Q80 4 88 3 M103 21 Q98 6 88 3" fill="none" stroke="#ee4266" strokeWidth="3" />
            <circle cx="108" cy="60" r="6" fill="#7fd4ff" stroke={INK} strokeWidth="1.4" />
            <path d="M102 60 Q108 54 114 60" fill="none" stroke="#fff" strokeWidth="2" />
          </g>
        </>
      )}
    </svg>
  )
}

/** A palm, foot at the origin, about 30 units tall at scale 1. Also drawn on the island of Minefield. */
export function Palm({ scale = 1 }: { scale?: number }): React.JSX.Element {
  const fronds = [-168, -128, -92, -52, -14, 24]
  return (
    <g transform={`scale(${scale})`}>
      <ellipse rx="9" ry="2.6" fill="#b99b6b" opacity="0.7" />
      {/* A trunk that leans, with the rings a palm has. */}
      <path d="M-1.6 0 Q3 -14 0.5 -27 L3.6 -27 Q6.4 -13 2.2 0 Z" fill="#a8743f" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M0.4 -5 h2.6 M1.4 -10 h2.8 M2 -15 h2.8 M2 -20 h2.6 M1.6 -24.5 h2.4" stroke="#5c3b1e" strokeWidth="0.8" strokeLinecap="round" />
      <g transform="translate(2.2 -27.5)">
        {fronds.map((degrees, n) => (
          <g key={degrees} transform={`rotate(${degrees})`}>
            <path d="M0 0 Q9 -8 19 1.5 Q9 -2.5 0 0 Z" fill={n % 2 === 0 ? '#2f9e6b' : '#3bceac'} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M1 -0.3 Q9 -4.5 17 0.6" fill="none" stroke="#14613f" strokeWidth="0.6" />
          </g>
        ))}
        <circle cx="-1.6" cy="1.6" r="1.7" fill="#5c3b1e" stroke={INK} strokeWidth="0.5" />
        <circle cx="1.4" cy="2.2" r="1.7" fill="#6b4a30" stroke={INK} strokeWidth="0.5" />
      </g>
    </g>
  )
}

/** A sniper's rifle for Sniper, muzzle to the right, with a band in the player's colour. */
export function Rifle({ colour }: { colour: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 100 30" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      {/* Bipod. */}
      <path d="M62 17 L56 29 M64 17 L70 29" stroke="#4b4560" strokeWidth="2" strokeLinecap="round" />
      {/* Stock, body and barrel. */}
      <path d="M2 12 H20 L24 14 H44 V20 H32 L29 27 H23 L24 20 H16 L6 23 H2 Z" fill="#6b4a30" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M40 13 H98 V17 H40 Z" fill="#3a3a44" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M90 11.5 H99 V18.5 H90 Z" fill="#1b1b22" stroke={INK} strokeWidth="1.2" />
      {/* Telescopic sight. */}
      <path d="M30 4 H58 V10 H30 Z" fill="#1b1b22" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M26 3 H31 V11 H26 Z M57 3 H63 V11 H57 Z" fill="#3a3a44" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M36 10 V13 M52 10 V13" stroke={INK} strokeWidth="2" />
      <path d="M44 13 H52 V20 H44 Z" fill={colour} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M33 20 Q35 25 39 24" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
