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
}

export function Board({ owners = {}, darts = [] }: BoardProps): React.JSX.Element {
  // When segments belong to players, the rest of the board goes quiet so the
  // usual red and green rings are not mistaken for a player's colour.
  const quiet = Object.keys(owners).length > 0
  return (
    <svg viewBox="-1.32 -1.32 2.64 2.64" className="dartboard" aria-hidden>
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
    </svg>
  )
}
