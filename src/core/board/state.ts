// The board as Autodarts reports it, checked and reduced to what the games
// need. See docs/autodarts-local-api.md for how the local API behaves.

export interface Dart {
  /** As reported: "T20", "S5", "M6" (surround, near the 6), "Miss". */
  name: string
  /** 1-20, or 25 for the bull and outer bull. Null for a miss. */
  number: number | null
  /** 0 for a miss. */
  multiplier: 0 | 1 | 2 | 3
  /** As reported: SingleInner, SingleOuter, Triple, Double, Outside, ... */
  bed: string
  /** Off the scoring area: the black surround, fully off, or a bounce-out. */
  miss: boolean
  /**
   * Where the dart is, for drawing it. Origin at the centre, 1.0 at about the
   * outer edge of the double ring, y up, x right. Null when Autodarts could
   * not place the dart. Never use this to work out the segment.
   */
  position: { x: number; y: number } | null
}

export interface BoardState {
  /** Autodarts' connection to its cloud. False is not an error. */
  cloudConnected: boolean
  /** False means detection is off (for example standby). */
  running: boolean
  event: string
  status: string
  /** The darts of the current turn, in throwing order. */
  throws: Dart[]
}

/** What the board can do right now. */
export type BoardCondition =
  /** Watching for darts. */
  | 'ready'
  /** Detection is starting, or has no cameras to start with. */
  | 'starting'
  /** Waiting for a takeout that never ends. Darts are lost until a reset. */
  | 'stuck'
  /** Detection is off. */
  | 'stopped'

export function boardCondition(state: BoardState): BoardCondition {
  if (!state.running || state.status === 'stopped') return 'stopped'
  if (state.status === 'starting') return 'starting'
  if (state.status === 'takeoutInProgress' && state.throws.length === 0) return 'stuck'
  return 'ready'
}

export class UnexpectedShapeError extends Error {}

function fail(what: string): never {
  throw new UnexpectedShapeError(`Unexpected answer from Autodarts: ${what}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDart(raw: unknown, index: number): Dart {
  if (!isRecord(raw)) fail(`throw ${index} is not an object`)
  const { segmentName, segmentNumber, multiplier, bed, coordsX, coordsY } = raw
  const failed = raw['failed'] === true
  // A dart reported without a number or ring is still a dart: it counts as
  // a miss, to be corrected by hand, rather than hiding every dart behind an
  // error.
  const number = typeof segmentNumber === 'number' ? segmentNumber : null
  // Bull as number 25 is an assumption carried over from the prototype; it
  // has not been seen in a recording yet.
  const onBoard = number !== null && ((Number.isInteger(number) && number >= 1 && number <= 20) || number === 25)
  const scoring = multiplier === 1 || multiplier === 2 || multiplier === 3
  const miss = failed || raw['bouncer'] === true || !scoring || !onBoard

  return {
    name: typeof segmentName === 'string' ? segmentName : 'Miss',
    number: miss ? null : number,
    multiplier: miss ? 0 : (multiplier as 1 | 2 | 3),
    bed: typeof bed === 'string' ? bed : '',
    miss,
    position:
      failed || typeof coordsX !== 'number' || typeof coordsY !== 'number'
        ? null
        : { x: coordsX, y: coordsY },
  }
}

/** Checks an answer of `GET /api/state`. Throws UnexpectedShapeError. */
export function parseBoardState(raw: unknown): BoardState {
  if (!isRecord(raw)) fail('the state is not an object')
  const { connected, running, event, status, throws } = raw
  if (typeof running !== 'boolean') fail('"running" is missing')
  if (typeof status !== 'string') fail('"status" is missing')
  if (!Array.isArray(throws)) fail('"throws" is missing')
  return {
    cloudConnected: connected !== false,
    running,
    event: typeof event === 'string' ? event : '',
    status,
    throws: throws.map(parseDart),
  }
}

export function sameDart(a: Dart, b: Dart): boolean {
  return (
    a.name === b.name &&
    a.number === b.number &&
    a.multiplier === b.multiplier &&
    a.bed === b.bed &&
    a.miss === b.miss &&
    a.position?.x === b.position?.x &&
    a.position?.y === b.position?.y
  )
}
