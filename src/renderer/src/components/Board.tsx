import { RING } from '../../../core/board/ring'
import { Palm } from '../theme/gameShowProps'
import type { Dart } from '../../../core/board/state'

// A dartboard drawn to the real proportions (1.0 is the outer edge of the
// double ring). Segments can be coloured per owner and darts shown where
// Autodarts placed them.

const R = { bull: 0.037, outerBull: 0.094, tripleIn: 0.582, tripleOut: 0.629, doubleIn: 0.953, doubleOut: 1 }

function point(radius: number, degrees: number): string {
  const a = (degrees * Math.PI) / 180
  return `${(radius * Math.sin(a)).toFixed(4)} ${(-radius * Math.cos(a)).toFixed(4)}`
}

/** A ring piece of one segment, 18 degrees wide. */
function piece(index: number, inner: number, outer: number): string {
  const from = index * 18 - 9
  const to = index * 18 + 9
  return `M${point(inner, from)} L${point(outer, from)} A${outer} ${outer} 0 0 1 ${point(outer, to)} L${point(inner, to)} A${inner} ${inner} 0 0 0 ${point(inner, from)} Z`
}

export interface BoardProps {
  /** Segment number to colour, for segments that belong to someone. */
  owners?: Record<number, string>
  /** Darts to mark, in throwing order. */
  darts?: Dart[]
  /** A short label to draw on a segment. */
  marks?: Record<number, string>
  /** Segments with an open pit on them: a trap that was sprung. */
  pits?: number[]
  /** A castle to draw on a segment: its walls and the hits they have taken. */
  castles?: Record<number, { colour: string; fortified: boolean; damage: number }>
  /**
   * 'target' draws the board as an archery target, by distance only; 'archery' is that target on a
   * stand in front of a forest, for Robin Hood.
   * 'stage' rings it with the bulbs of a theatre, for Spotlight; 'scope' with the marks of a telescopic
   * sight, for Sniper; 'hazard' with warning stripes, for Time Bomb.
   * 'map' draws it as an old map on parchment, for Land Grab.
   * 'ring' puts the ropes and corner posts of a boxing ring around it, for Last One Standing.
   * 'island' makes it a treasure island for Minefield: sea around it, surf on the beach and a palm in the middle.
   * 'temple' gives the board a rim of old stone blocks with moss, for Trap Runner.
   * 'piggy' draws it as Piggy Bank counts it: a golden double ring with
   * coins on it, no triple ring, and a surround that spells trouble.
   */
  variant?: 'board' | 'target' | 'piggy' | 'temple' | 'island' | 'ring' | 'map' | 'stage' | 'scope' | 'hazard' | 'archery'
  /** A cross to aim at, in board coordinates. */
  cross?: { x: number; y: number }
  /** Small coloured dots, for darts that are no longer in the board. */
  dots?: { x: number; y: number; colour: string }[]
  /** Called with board coordinates when the board is tapped. */
  onTap?: (x: number, y: number) => void
}

const VIEW = 1.32

/** Where the coins sit on Piggy Bank's golden ring, on the wires between two numbers. */
const PIGGY_COINS = [45, 135, 225, 315]

const ZONES: [radius: number, colour: string, points: number][] = [
  [R.doubleOut, '#f3ead7', 3],
  [R.tripleIn, '#4d9de0', 4],
  [R.outerBull, '#ee4266', 5],
  [R.bull, '#ffd23f', 6],
]

function DartMarks({ darts }: { darts: Dart[] }): React.JSX.Element {
  return (
    <>
      {darts.map((dart, index) =>
        dart.position ? (
          <g key={index} transform={`translate(${dart.position.x} ${-dart.position.y})`}>
            <circle r="0.06" fill="#ffffff" stroke="#1b0a38" strokeWidth="0.02" />
            <text fontSize="0.08" fontWeight="800" textAnchor="middle" dominantBaseline="central" fill="#1b0a38">
              {index + 1}
            </text>
          </g>
        ) : null,
      )}
    </>
  )
}

/** The board as an archery target: four zones along the real wires. */
/**
 * Where the trees of Robin Hood stand behind the target, in board units (y
 * up): the middle of each crown. An arrow that misses the target goes into
 * the nearest.
 */
export const ARCHERY_TREES = [
  { x: -1.0, y: 0.95 },
  { x: 0, y: 1.14 },
  { x: 1.0, y: 0.95 },
  { x: -1.17, y: -0.25 },
  { x: 1.17, y: -0.25 },
]

/** One tree of the forest: a trunk down to the grass and a crown of three lumps. */
function Tree({ x, y, tone }: { x: number; y: number; tone: number }): React.JSX.Element {
  const green = ['#2f9e6b', '#23805a', '#3fa565'][tone % 3]
  return (
    <g>
      <path d={`M${x - 0.045} ${-y} L${x - 0.06} 1.32 L${x + 0.06} 1.32 L${x + 0.045} ${-y} Z`} fill="#8a5a33" stroke="#1b0a38" strokeWidth="0.012" />
      <g fill={green} stroke="#1b0a38" strokeWidth="0.014">
        <circle cx={x - 0.15} cy={-y + 0.06} r="0.17" />
        <circle cx={x + 0.15} cy={-y + 0.06} r="0.17" />
        <circle cx={x} cy={-y - 0.08} r="0.21" />
      </g>
      <circle cx={x} cy={-y + 0.04} r="0.16" fill={green} />
    </g>
  )
}

function Target({ darts, forest = false }: { darts: Dart[]; forest?: boolean }): React.JSX.Element {
  return (
    <svg viewBox="-1.32 -1.32 2.64 2.64" className="dartboard" aria-hidden>
      {forest ? (
        <g>
          {/* The forest behind, the grass below, and the stand the target hangs on. */}
          {ARCHERY_TREES.map((tree, n) => (
            <Tree key={n} {...tree} tone={n} />
          ))}
          <path d="M-1.32 1.1 Q-0.6 1.02 0 1.1 Q0.6 1.18 1.32 1.08 V1.32 H-1.32 Z" fill="#2f9e6b" stroke="#1b0a38" strokeWidth="0.012" />
          <path d="M-0.5 0.5 L-0.86 1.3 M0.5 0.5 L0.86 1.3 M0 -1 V-1.14" stroke="#8a5a33" strokeWidth="0.09" strokeLinecap="round" />
          <path d="M-0.5 0.5 L-0.86 1.3 M0.5 0.5 L0.86 1.3" stroke="#5c3b1e" strokeWidth="0.02" strokeLinecap="round" />
          {/* The straw the rings are painted on. */}
          <circle r="1.05" fill="#d9b66a" stroke="#1b0a38" strokeWidth="0.02" />
        </g>
      ) : (
        <circle r="1.3" fill="#1b0a38" />
      )}
      {ZONES.map(([radius, colour]) => (
        <circle key={radius} r={radius} fill={colour} stroke="#1b0a38" strokeWidth="0.012" />
      ))}
      {RING.map((segment, index) => (
        <path key={segment} d={`M${point(R.outerBull, index * 18 - 9)} L${point(R.doubleOut, index * 18 - 9)}`} stroke="rgb(27 10 56 / 18%)" strokeWidth="0.006" />
      ))}
      <text y={-0.79} fontSize="0.22" fontWeight="800" textAnchor="middle" dominantBaseline="central" fill="#1b0a38">3</text>
      <text y={-0.34} fontSize="0.22" fontWeight="800" textAnchor="middle" dominantBaseline="central" fill="#ffffff">4</text>
      <DartMarks darts={darts} />
    </svg>
  )
}

/** A small castle with a flag; a second wall when fortified, cracks for hits. */
function Castle({ colour, fortified, damage }: { colour: string; fortified: boolean; damage: number }): React.JSX.Element {
  const stone = { fill: '#f3ead7', stroke: '#1b0a38', strokeWidth: 0.012, strokeLinejoin: 'round' as const }
  return (
    <g>
      {fortified && <path d="M-0.125 0.09 V-0.01 H-0.095 V0.02 H-0.065 V-0.01 H0.065 V0.02 H0.095 V-0.01 H0.125 V0.09 Z" {...stone} fill="#cfc4ad" />}
      <path d="M-0.07 0.09 V-0.06 H-0.045 V-0.035 H-0.015 V-0.06 H0.015 V-0.035 H0.045 V-0.06 H0.07 V0.09 Z" {...stone} />
      <path d="M-0.018 0.09 V0.04 A0.018 0.018 0 0 1 0.018 0.04 V0.09 Z" fill="#1b0a38" />
      <path d="M0 -0.06 V-0.15" stroke="#1b0a38" strokeWidth="0.012" strokeLinecap="round" />
      <path d="M0 -0.15 L0.07 -0.125 L0 -0.1 Z" fill={colour} stroke="#ffffff" strokeWidth="0.01" strokeLinejoin="round" />
      {['M-0.05 -0.02 l0.02 0.03 l-0.015 0.03', 'M0.045 -0.01 l-0.02 0.03 l0.02 0.035'].slice(0, damage).map((crack) => (
        <path key={crack} d={crack} fill="none" stroke="#ee4266" strokeWidth="0.014" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  )
}

/** An open pit with spikes in it, about a fifth of the board's radius wide. */
export function Pit(): React.JSX.Element {
  return (
    <g>
      <ellipse rx="0.125" ry="0.1" fill="#8a5a33" stroke="#1b0a38" strokeWidth="0.014" />
      <ellipse rx="0.1" ry="0.076" fill="#05010d" />
      {[-0.06, -0.02, 0.02, 0.06].map((x, n) => (
        <path
          key={x}
          d={`M${x - 0.02} 0.05 L${x} ${n % 2 === 0 ? -0.035 : -0.06} L${x + 0.02} 0.05 Z`}
          fill="#e8e4f0"
          stroke="#1b0a38"
          strokeWidth="0.008"
          strokeLinejoin="round"
        />
      ))}
      {/* The near rim hides the feet of the spikes. */}
      <path d="M-0.1 0.02 A0.1 0.076 0 0 0 0.1 0.02 L0.125 0.02 A0.125 0.1 0 0 1 -0.125 0.02 Z" fill="#8a5a33" stroke="#1b0a38" strokeWidth="0.01" />
    </g>
  )
}

export function Board({
  owners = {},
  darts = [],
  marks = {},
  castles = {},
  pits = [],
  variant = 'board',
  cross,
  dots = [],
  onTap,
}: BoardProps): React.JSX.Element {
  if (variant === 'target' || variant === 'archery') return <Target darts={darts} forest={variant === 'archery'} />
  // When segments belong to players, the rest of the board goes quiet so the
  // usual red and green rings are not mistaken for a player's colour.
  const quiet = Object.keys(owners).length > 0
  const piggy = variant === 'piggy'
  const temple = variant === 'temple'
  const island = variant === 'island'
  const boxing = variant === 'ring'
  const map = variant === 'map'
  const stage = variant === 'stage'
  const scope = variant === 'scope'
  const hazard = variant === 'hazard'
  const tap = (event: React.MouseEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    // The drawing is square and centred inside the element.
    const size = Math.min(box.width, box.height)
    const x = ((event.clientX - box.left - (box.width - size) / 2) / size) * 2 * VIEW - VIEW
    const y = ((event.clientY - box.top - (box.height - size) / 2) / size) * 2 * VIEW - VIEW
    onTap?.(x, -y)
  }
  return (
    <svg
      viewBox="-1.32 -1.32 2.64 2.64"
      className="dartboard"
      aria-hidden={!onTap}
      onClick={onTap ? tap : undefined}
      style={onTap ? { cursor: 'crosshair' } : undefined}
    >
      <circle r="1.3" fill={piggy ? '#4a0f2c' : temple ? '#4b4038' : island ? '#1f6fa8' : '#1b0a38'} />
      {stage && (
        <g>
          <circle r="1.3" fill="#5a0f24" />
          <circle r="1.275" fill="none" stroke="#3a0916" strokeWidth="0.07" />
          {Array.from({ length: 40 }, (_, n) => (
            <circle key={n} className={n % 2 === 0 ? 'bulb' : 'bulb bulb--late'} cx={point(1.275, n * 9 + 4.5).split(' ')[0]} cy={point(1.275, n * 9 + 4.5).split(' ')[1]} r="0.024" fill="#ffd23f" />
          ))}
        </g>
      )}
      {scope && (
        <g>
          <circle r="1.3" fill="#2c3324" />
          <circle r="1.285" fill="none" stroke="#9be564" strokeWidth="0.014" />
          <circle r="1.03" fill="none" stroke="#9be564" strokeWidth="0.014" />
          {/* The marks of a telescopic sight round the edge. */}
          {Array.from({ length: 40 }, (_, n) => (
            <path key={n} d={`M${point(1.03, n * 9 + 4.5)} L${point(n % 2 === 0 ? 1.075 : 1.055, n * 9 + 4.5)}`} stroke="#9be564" strokeWidth="0.012" />
          ))}
        </g>
      )}
      {hazard && (
        <g>
          <circle r="1.3" fill="#1b1b22" />
          <circle r="1.27" fill="none" stroke="#ffd23f" strokeWidth="0.06" strokeDasharray="0.09 0.09" />
          <circle r="1.03" fill="none" stroke="#ffd23f" strokeWidth="0.02" />
        </g>
      )}
      {map && (
        <g>
          <circle r="1.3" fill="#e9d8a6" />
          <circle r="1.285" fill="none" stroke="#8a5a33" strokeWidth="0.022" />
          <circle r="1.255" fill="none" stroke="#8a5a33" strokeWidth="0.008" />
          {/* The ticks of a compass round the edge. */}
          {Array.from({ length: 40 }, (_, n) => (
            <path key={n} d={`M${point(1.02, n * 9)} L${point(n % 2 === 0 ? 1.06 : 1.04, n * 9)}`} stroke="#8a5a33" strokeWidth="0.012" />
          ))}
        </g>
      )}
      {boxing && (
        <g>
          <circle r="1.3" fill="#243a5e" />
          {/* Three ropes, and a padded post in each corner. */}
          <circle r="1.285" fill="none" stroke="#ee4266" strokeWidth="0.028" />
          <circle r="1.05" fill="none" stroke="#f3ead7" strokeWidth="0.022" />
          <circle r="1.02" fill="none" stroke="#7fd4ff" strokeWidth="0.018" />
          {[45, 135, 225, 315].map((degrees, n) => (
            <g key={degrees} transform={`translate(${point(1.27, degrees)})`}>
              <circle r="0.075" fill={n % 2 === 0 ? '#ee4266' : '#7fd4ff'} stroke="#1b0a38" strokeWidth="0.02" />
              <circle r="0.03" fill="#f3ead7" />
            </g>
          ))}
        </g>
      )}
      {island && (
        <g fill="none" strokeLinecap="round">
          <circle r="1.2" stroke="#3d93cc" strokeWidth="0.2" opacity="0.5" />
          {/* Surf where the sea meets the sand. */}
          <circle r="1.035" stroke="#e9f7ff" strokeWidth="0.05" strokeDasharray="0.16 0.07" />
        </g>
      )}
      {temple && (
        <g>
          <circle r="1.275" fill="none" stroke="#8b7a6b" strokeWidth="0.05" />
          <circle r="1.03" fill="none" stroke="#2a211e" strokeWidth="0.03" />
          {/* The joints between the blocks, one between every two numbers. */}
          {RING.map((segment, index) => (
            <path
              key={segment}
              d={`M${point(1.03, index * 18 + 9)} L${point(1.3, index * 18 + 9)}`}
              stroke="#2a211e"
              strokeWidth="0.022"
              strokeLinecap="round"
            />
          ))}
          {/* Moss in a few of the joints. */}
          {[27, 99, 153, 225, 297].map((degrees, n) => (
            <circle key={degrees} cx={point(1.27, degrees).split(' ')[0]} cy={point(1.27, degrees).split(' ')[1]} r={0.045 + (n % 2) * 0.02} fill="#2f9e6b" opacity="0.85" />
          ))}
        </g>
      )}
      {piggy && <circle r={(R.doubleIn + R.doubleOut) / 2} fill="none" stroke="#ffd23f" strokeWidth="0.16" opacity="0.3" />}
      {RING.map((segment, index) => {
        const owner = owners[segment]
        const even = index % 2 === 0
        // On the map free land is parchment in two shades.
        const single = owner ?? (map ? (even ? '#d3ba82' : '#f1e4bd') : even ? '#2a1b3d' : '#f3ead7')
        const ring = owner ?? (map ? (even ? '#b59a66' : '#d8c594') : quiet ? (even ? '#4a4458' : '#b9b2a6') : even ? '#ee4266' : '#3bceac')
        // In Piggy Bank the triple ring pays like the single around it and the double ring is gold.
        const triple = piggy ? single : ring
        const double = piggy ? (even ? '#ffd23f' : '#f5b21e') : ring
        return (
          <g key={segment} stroke="#1b0a38" strokeWidth="0.008">
            <path d={piece(index, R.outerBull, R.tripleIn)} fill={single} opacity={owner ? 0.85 : 1} />
            <path d={piece(index, R.tripleIn, R.tripleOut)} fill={triple} />
            <path d={piece(index, R.tripleOut, R.doubleIn)} fill={single} opacity={owner ? 0.85 : 1} />
            <path d={piece(index, R.doubleIn, R.doubleOut)} fill={double} />
            <text
              x={1.16 * Math.sin((index * 18 * Math.PI) / 180)}
              y={-1.16 * Math.cos((index * 18 * Math.PI) / 180)}
              fontSize="0.17"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
              stroke="none"
              fill={island ? '#ffffff' : map ? '#5c3b1e' : scope ? '#d6f5b8' : (owner ?? '#ffffff')}
            >
              {segment}
            </text>
          </g>
        )
      })}
      <circle r={R.outerBull} fill={quiet ? '#b9b2a6' : '#3bceac'} stroke="#1b0a38" strokeWidth="0.008" />
      <circle r={R.bull} fill={quiet ? '#4a4458' : '#ee4266'} stroke="#1b0a38" strokeWidth="0.008" />
      {island && (
        // A palm in the middle: the bull does nothing in this game.
        <g transform="translate(0 0.1)">
          <Palm scale={0.0125} />
        </g>
      )}
      {piggy &&
        PIGGY_COINS.map((degrees) => (
          <g key={degrees} transform={`translate(${point((R.doubleIn + R.doubleOut) / 2, degrees)})`}>
            <circle r="0.155" fill="#ffd23f" stroke="#1b0a38" strokeWidth="0.022" />
            <circle r="0.122" fill="none" stroke="#c98a12" strokeWidth="0.014" />
            <text fontSize="0.16" fontWeight="800" textAnchor="middle" dominantBaseline="central" fill="#1b0a38">
              ×3
            </text>
          </g>
        ))}
      {RING.map((segment, index) =>
        marks[segment] ? (
          <text
            key={segment}
            x={0.79 * Math.sin((index * 18 * Math.PI) / 180)}
            y={-0.79 * Math.cos((index * 18 * Math.PI) / 180)}
            fontSize="0.13"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#1b0a38"
            stroke="#ffffff"
            strokeWidth="0.035"
            paintOrder="stroke"
          >
            {marks[segment]}
          </text>
        ) : null,
      )}
      {RING.map((segment, index) => {
        const castle = castles[segment]
        if (!castle) return null
        const angle = (index * 18 * Math.PI) / 180
        return (
          <g key={segment} transform={`translate(${0.79 * Math.sin(angle)} ${-0.79 * Math.cos(angle)})`}>
            <Castle {...castle} />
          </g>
        )
      })}
      {pits.map((segment) => {
        const index = RING.indexOf(segment)
        if (index < 0) return null
        const angle = (index * 18 * Math.PI) / 180
        return (
          <g key={segment}>
            {/* The whole segment glows red, so the trap reads from across the room. */}
            <path d={piece(index, R.outerBull, R.doubleOut)} fill="#ff2d55" opacity="0.55" />
            <path d={piece(index, R.outerBull, R.doubleOut)} fill="none" stroke="#ff2d55" strokeWidth="0.03" />
            <g transform={`translate(${0.76 * Math.sin(angle)} ${-0.76 * Math.cos(angle)}) scale(1.5)`}>
              <Pit />
            </g>
          </g>
        )
      })}
      {dots.map((dot, index) => (
        <circle key={index} cx={dot.x} cy={-dot.y} r="0.045" fill={dot.colour} stroke="#1b0a38" strokeWidth="0.015" />
      ))}
      {cross && (
        <g transform={`translate(${cross.x} ${-cross.y})`} strokeLinecap="round">
          <path d="M-0.11 -0.11 L0.11 0.11 M-0.11 0.11 L0.11 -0.11" strokeWidth="0.075" stroke="#1b0a38" />
          <path d="M-0.11 -0.11 L0.11 0.11 M-0.11 0.11 L0.11 -0.11" strokeWidth="0.04" stroke="#ff2d55" />
        </g>
      )}
      <DartMarks darts={darts} />
    </svg>
  )
}
