import { RING } from '../../../core/board/ring'
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
  /** A castle to draw on a segment: its walls and the hits they have taken. */
  castles?: Record<number, { colour: string; fortified: boolean; damage: number }>
  /** 'target' draws the board as an archery target, by distance only. */
  variant?: 'board' | 'target'
  /** A cross to aim at, in board coordinates. */
  cross?: { x: number; y: number }
  /** Small coloured dots, for darts that are no longer in the board. */
  dots?: { x: number; y: number; colour: string }[]
  /** Called with board coordinates when the board is tapped. */
  onTap?: (x: number, y: number) => void
}

const VIEW = 1.32

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
function Target({ darts }: { darts: Dart[] }): React.JSX.Element {
  return (
    <svg viewBox="-1.32 -1.32 2.64 2.64" className="dartboard" aria-hidden>
      <circle r="1.3" fill="#1b0a38" />
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

export function Board({
  owners = {},
  darts = [],
  marks = {},
  castles = {},
  variant = 'board',
  cross,
  dots = [],
  onTap,
}: BoardProps): React.JSX.Element {
  if (variant === 'target') return <Target darts={darts} />
  // When segments belong to players, the rest of the board goes quiet so the
  // usual red and green rings are not mistaken for a player's colour.
  const quiet = Object.keys(owners).length > 0
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
      <circle r="1.3" fill="#1b0a38" />
      {RING.map((segment, index) => {
        const owner = owners[segment]
        const even = index % 2 === 0
        const single = owner ?? (even ? '#2a1b3d' : '#f3ead7')
        const ring = owner ?? (quiet ? (even ? '#4a4458' : '#b9b2a6') : even ? '#ee4266' : '#3bceac')
        return (
          <g key={segment} stroke="#1b0a38" strokeWidth="0.008">
            <path d={piece(index, R.outerBull, R.tripleIn)} fill={single} opacity={owner ? 0.85 : 1} />
            <path d={piece(index, R.tripleIn, R.tripleOut)} fill={ring} />
            <path d={piece(index, R.tripleOut, R.doubleIn)} fill={single} opacity={owner ? 0.85 : 1} />
            <path d={piece(index, R.doubleIn, R.doubleOut)} fill={ring} />
            <text
              x={1.16 * Math.sin((index * 18 * Math.PI) / 180)}
              y={-1.16 * Math.cos((index * 18 * Math.PI) / 180)}
              fontSize="0.17"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
              stroke="none"
              fill={owner ?? '#ffffff'}
            >
              {segment}
            </text>
          </g>
        )
      })}
      <circle r={R.outerBull} fill={quiet ? '#b9b2a6' : '#3bceac'} stroke="#1b0a38" strokeWidth="0.008" />
      <circle r={R.bull} fill={quiet ? '#4a4458' : '#ee4266'} stroke="#1b0a38" strokeWidth="0.008" />
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
