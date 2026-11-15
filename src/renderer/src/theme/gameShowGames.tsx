import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { SniperView } from '../../../core/game/sniper'
import type { SpotlightView } from '../../../core/game/spotlight'
import { RING } from '../../../core/board/ring'
import type { AnimationSet, SceneProps, Spot } from '../animation/pack'
import { DIG_TIME } from '../animation/timeline'
import { Avatar } from '../components/Avatar'
import {
  Burst,
  Exploded,
  FIRE,
  Flash,
  Lost,
  Pin,
  POP,
  Pow,
  Scored,
  SHAKE,
  Sparkles,
  Spectacle,
  unit,
  useNudge,
  Won,
} from './gameShowAnimations'
import { CallArrow } from './gameShowProps'

// The default theme's own animations for eight more games. Like the general
// ones: simple shapes moved with `motion`, placed over whatever the scene
// shows by looking up where things are on screen.

type Stage = SceneProps['stage']
type Point = { x: number; y: number }

const INK = '#1b0a38'

const avatarElement = (player: string): Element | null =>
  document.querySelector(`[data-anim-avatar="${CSS.escape(player)}"]`)

const SPIN = (turns: number): Keyframe[] => [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-360 * turns}deg)` }]
const BOW: Keyframe[] = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(28deg)' },
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(28deg)' },
  { transform: 'rotate(0deg)' },
]

/** The segment the dart of this cue landed in, on screen. */
const segmentOf = (stage: Stage): Point | null => {
  const number = stage.story?.dart.number
  return number && RING.includes(number) ? stage.segmentPoint(number) : null
}

// ------------------------------------------------------------------- Race

/** Forward: dust and speed lines behind the racer; a flame for three steps. */
function RaceForward(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const at = stage.avatar(step.scene.player)
  const nitro = step.scene.amount >= 3
  return (
    <>
      <Scored {...props} />
      {at && (
        <Pin at={{ x: at.x - at.size * 0.6, y: at.y }}>
          {[-1, 0, 1].map((row) => (
            <motion.i
              key={`line${row}`}
              className="fx-streak"
              style={{ top: row * at.size * 0.28 }}
              initial={{ x: 0, scaleX: 0, opacity: 0 }}
              animate={{ x: -at.size * 1.6, scaleX: [0, 1, 0.4], opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.45, delay: step.at + (row + 1) * 0.06, ease: 'easeOut' }}
            />
          ))}
          {[0, 1, 2].map((n) => (
            <motion.i
              key={`dust${n}`}
              className="fx-smoke fx-smoke--dust"
              initial={{ x: 0, y: at.size * 0.3, scale: 0.2, opacity: 0 }}
              animate={{ x: -at.size * (0.5 + n * 0.5), y: at.size * 0.15, scale: [0.2, 0.8, 1.1], opacity: [0, 0.8, 0] }}
              transition={{ duration: step.length, delay: step.at + n * 0.08, ease: 'easeOut' }}
            />
          ))}
          {nitro && (
            <motion.svg
              className="fx-flame"
              viewBox="-30 -12 34 24"
              style={{ width: at.size * 1.3 }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1.2, 0.8, 1.3, 0], opacity: [0, 1, 1, 1, 0] }}
              transition={{ duration: step.length, delay: step.at, ease: 'easeOut' }}
            >
              <path d="M0 -9 Q-16 -10 -28 0 Q-16 10 0 9 Z" fill="#f08a4b" stroke="#ee4266" strokeWidth="1.5" />
              <path d="M0 -5 Q-10 -5 -17 0 Q-10 5 0 5 Z" fill="#ffd23f" />
            </motion.svg>
          )}
        </Pin>
      )}
    </>
  )
}

/** Pushed back: a banana peel, or an oil slick for two steps or more, and a spin. */
function RacePushed({ step, stage }: SceneProps<'attacked'>): React.JSX.Element | null {
  const { by, victim, amount } = step.scene
  const from = stage.avatar(by)
  const to = stage.avatar(victim)
  const oil = amount >= 2
  const flight = step.length * 0.5
  useNudge(() => avatarElement(victim)?.firstElementChild ?? null, SPIN(oil ? 2 : 1), step.at + flight, oil ? 750 : 500)
  if (!from || !to) return null
  const feet = { x: to.x, y: to.y + to.size * 0.35 }
  const lift = unit() * 9
  return (
    <>
      <Pin at={from}>
        <motion.svg
          className="fx-thrown"
          viewBox="-14 -10 28 20"
          style={{ width: to.size * (oil ? 1.3 : 0.8) }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: [0, (feet.x - from.x) / 2, feet.x - from.x, feet.x - from.x],
            y: [0, (feet.y - from.y) / 2 - lift, feet.y - from.y, feet.y - from.y],
            opacity: [0, 1, 1, 0],
            rotate: oil ? 0 : [0, 360, 540, 540],
          }}
          transition={{ duration: step.length + 0.3, delay: step.at, times: [0, 0.2, 0.4, 1], ease: 'easeIn' }}
        >
          {oil ? (
            <>
              <path d="M-13 2 Q-12 -6 -3 -5 Q2 -9 8 -4 Q14 -3 12 3 Q8 8 0 6 Q-8 9 -13 2 Z" fill="#17131f" stroke="#4b4560" strokeWidth="1" />
              <ellipse cx="-3" cy="-1" rx="4" ry="1.6" fill="#8b86a0" opacity="0.7" />
            </>
          ) : (
            <>
              <path d="M-10 6 Q-2 -2 0 -8 Q2 -2 10 6 Q4 3 0 -1 Q-4 3 -10 6 Z" fill="#ffd23f" stroke="#b8860b" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M0 -8 L0 -10" stroke="#7a5c12" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </motion.svg>
      </Pin>
      <Burst at={feet} delay={step.at + flight} colours={oil ? ['#17131f', '#4b4560'] : ['#ffd23f', '#ffffff']} pieces={oil ? 12 : 7} reach={oil ? 10 : 6} length={0.5} />
    </>
  )
}

/** The finish: a chequered flag, the tape snapping, a camera flash. */
function RaceWon(props: SceneProps<'won'>): React.JSX.Element {
  const { step } = props
  return (
    <>
      <Flash delay={step.at} strength={0.9} />
      <Flash delay={step.at + 0.18} strength={0.6} />
      {[-1, 1].map((side) => (
        <motion.i
          key={side}
          className="fx-tape"
          style={side === -1 ? { right: '50%' } : { left: '50%' }}
          initial={{ rotate: 0, opacity: 1, y: 0 }}
          animate={{ rotate: side * -38, opacity: [1, 1, 0], y: unit() * 22 }}
          transition={{ duration: 0.8, delay: step.at + 0.05, ease: 'easeIn' }}
        />
      ))}
      <Won {...props} />
      <div className="fx-centre" style={{ alignItems: 'start', paddingTop: '6vh' }}>
        <motion.i
          className="fx-chequered"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.1, 1, 1, 0], rotate: [-20, 8, -8, 8, 0] }}
          transition={{ duration: step.length, delay: step.at, times: [0, 0.15, 0.4, 0.8, 1] }}
        />
      </div>
    </>
  )
}

// ------------------------------------------------------------- Robin Hood

/** An arrow, drawn with its point on the origin and its shaft up to the right. */
function Arrow({ colour = '#b98a5a' }: { colour?: string }): React.JSX.Element {
  return (
    <g>
      <path d="M0 0 L26 -26" stroke={colour} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0 0 L7 -2 L2 -7 Z" fill="#9a97a6" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M20 -20 L27 -19 L30 -30 L19 -27 Z" fill="#ee4266" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
    </g>
  )
}

/** The dart lands as an arrow that quivers where it struck. */
function ArrowLands({ step, stage }: SceneProps<'impact'>): React.JSX.Element | null {
  const { dart } = step.scene.story
  const at = stage.boardPoint(dart)
  useNudge(stage.boardElement, SHAKE, step.at, 260, stage.calm || dart.miss)
  // Off the board the arrow goes into the tree instead.
  if (!at || dart.miss) return null
  return (
    <Pin at={at}>
      <motion.svg
        className="fx-arrow"
        viewBox="-4 -34 38 38"
        initial={{ x: unit() * 30, y: -unit() * 30, opacity: 0, rotate: 0 }}
        animate={{ x: 0, y: 0, opacity: [0, 1, 1, 1, 0], rotate: [0, 0, -9, 7, -5, 3, 0] }}
        transition={{
          x: { duration: 0.12, delay: step.at, ease: 'easeIn' },
          y: { duration: 0.12, delay: step.at, ease: 'easeIn' },
          rotate: { duration: 0.6, delay: step.at + 0.12, ease: 'easeOut' },
          opacity: { duration: 1.1, delay: step.at, times: [0, 0.08, 0.5, 0.8, 1] },
        }}
      >
        <Arrow />
      </motion.svg>
    </Pin>
  )
}

/** Off the board: the arrow thuds into a tree and a bird flies up. */
function TreeMiss({ step, stage }: SceneProps<'bad'>): React.JSX.Element | null {
  const at = stage.dartPoint()
  if (!at) return null
  const size = unit() * 24
  return (
    <Pin at={at}>
      <motion.svg
        className="fx-tree"
        viewBox="-30 -50 60 62"
        style={{ width: size }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1, 1, 1], opacity: [0, 1, 1, 1, 0], rotate: [0, 0, -3, 2, 0] }}
        transition={{ duration: step.length + 0.3, delay: step.at, times: [0, 0.15, 0.3, 0.45, 1], ease: 'easeOut' }}
      >
        <rect x="-5" y="-12" width="10" height="24" rx="2" fill="#8a5a33" stroke={INK} strokeWidth="1.2" />
        <path d="M-22 -14 Q-30 -30 -14 -36 Q-10 -50 6 -44 Q24 -46 22 -28 Q30 -16 14 -12 Z" fill="#3fa565" stroke={INK} strokeWidth="1.2" />
        <g transform="translate(4 0) scale(0.55)">
          <Arrow />
        </g>
      </motion.svg>
      <motion.svg
        className="fx-bird"
        viewBox="-12 -8 24 16"
        style={{ width: size * 0.4 }}
        initial={{ x: 0, y: -size * 0.5, opacity: 0 }}
        animate={{ x: size * 1.2, y: -size * 1.5, opacity: [0, 1, 1, 0] }}
        transition={{ duration: step.length, delay: step.at + 0.3, ease: 'easeOut' }}
      >
        <motion.path
          d="M-10 0 Q-5 -8 0 0 Q5 -8 10 0"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          animate={{ scaleY: [1, -0.6, 1] }}
          transition={{ duration: 0.22, repeat: Infinity }}
        />
      </motion.svg>
    </Pin>
  )
}

/** Bullseye: the arrow splits the one already standing there; feathers fly. */
function SplitArrow(props: SceneProps<'spectacle'>): React.JSX.Element {
  const { step, stage } = props
  const at = step.scene.what === 'bullseye' ? stage.board() : null
  return (
    <>
      <Spectacle {...props} />
      {at && (
        <>
          <Pin at={at}>
            {[-1, 1].map((side) => (
              <motion.svg
                key={side}
                className="fx-arrow"
                viewBox="-4 -34 38 38"
                initial={{ rotate: 0, opacity: 1 }}
                animate={{ rotate: side * 34, opacity: [1, 1, 0] }}
                transition={{ duration: step.length * 0.8, delay: step.at + 0.1, ease: 'easeOut' }}
              >
                <Arrow colour={side === -1 ? '#8a5a33' : '#b98a5a'} />
              </motion.svg>
            ))}
          </Pin>
          <Burst at={{ x: at.x + unit() * 6, y: at.y - unit() * 6 }} delay={step.at + 0.1} colours={['#ffffff', '#ee4266', '#ffffff']} pieces={14} reach={12} length={1} />
        </>
      )}
    </>
  )
}

// -------------------------------------------------------------- Spotlight

/** A pool of light on the board. */
function Beam({ size, children }: { size: number; children?: React.ReactNode }): React.JSX.Element {
  return (
    <i className="fx-pool" style={{ width: size, height: size }}>
      {children}
    </i>
  )
}

/** A new round: the spotlight sweeps over the board and stops on its target. */
function SpotlightSweep({ step, stage }: SceneProps<'round'>): React.JSX.Element | null {
  const view = stage.view as SpotlightView | null
  const board = stage.board()
  if (!board || !view || typeof view.target !== 'number') return null
  const index = RING.indexOf(view.target)
  // A few stops around the ring, each closer, ending on the target.
  const stops = [9, -6, 4, -2, 1, 0].map((off) => stage.segmentPoint(RING[(index + off + RING.length) % RING.length]!)!)
  return (
    <Pin at={{ x: 0, y: 0 }}>
      <motion.div
        initial={{ x: stops[0]!.x, y: stops[0]!.y, opacity: 0, scale: 1 }}
        animate={{
          x: stops.map((stop) => stop.x),
          y: stops.map((stop) => stop.y),
          opacity: [0, 1, 1, 1, 1, 1, 0],
          scale: [1, 1, 1, 1, 1, 1.5, 1.2],
        }}
        transition={{
          x: { duration: step.length * 0.75, delay: step.at, ease: 'easeInOut' },
          y: { duration: step.length * 0.75, delay: step.at, ease: 'easeInOut' },
          opacity: { duration: step.length, delay: step.at, times: [0, 0.1, 0.3, 0.5, 0.7, 0.85, 1] },
          scale: { duration: step.length, delay: step.at, times: [0, 0.2, 0.4, 0.6, 0.74, 0.82, 1] },
        }}
      >
        <Beam size={board.size * 0.3} />
      </motion.div>
    </Pin>
  )
}

/** A beam of light from above onto an avatar. */
function StageLight({ at, delay, length, away }: { at: Spot; delay: number; length: number; away?: boolean }): React.JSX.Element {
  const height = at.y + at.size * 0.5
  return (
    <motion.i
      className="fx-stagelight"
      style={{ left: at.x - at.size * 1.1, width: at.size * 2.2, height }}
      initial={{ opacity: 0, rotate: 0 }}
      animate={away ? { opacity: [0, 0.9, 0.9, 0], rotate: [0, 0, 0, 38] } : { opacity: [0, 0.9, 0.9, 0], rotate: 0 }}
      transition={{ duration: length, delay, times: [0, 0.15, away ? 0.45 : 0.8, 1], ease: 'easeInOut' }}
    />
  )
}

/** On the target: the avatar bows in the beam while roses are thrown. */
function SpotlightBow(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const { player, amount } = step.scene
  const at = amount === 3 ? stage.avatar(player) : null
  useNudge(() => avatarElement(player)?.firstElementChild ?? null, BOW, step.at + 0.2, 900, amount !== 3)
  return (
    <>
      <Scored {...props} />
      {at && (
        <>
          <StageLight at={at} delay={step.at} length={step.length + 0.5} />
          <Pin at={at}>
            {[0, 1, 2, 3, 4].map((n) => {
              const side = n % 2 === 0 ? 1 : -1
              return (
                <motion.svg
                  key={n}
                  className="fx-rose"
                  viewBox="-8 -8 16 22"
                  initial={{ x: side * unit() * 45, y: unit() * 30, opacity: 0, rotate: side * -90 }}
                  animate={{
                    x: [side * unit() * 45, side * unit() * 18, (n - 2) * at.size * 0.35],
                    y: [unit() * 30, -unit() * 8, at.size * 0.45],
                    opacity: [0, 1, 1, 0],
                    rotate: side * 60,
                  }}
                  transition={{ duration: step.length + 0.4, delay: step.at + 0.15 + n * 0.09, ease: 'easeOut', opacity: { duration: step.length + 0.4, delay: step.at + 0.15 + n * 0.09, times: [0, 0.15, 0.8, 1] } }}
                >
                  <path d="M0 4 L0 13 M0 9 L4 6" stroke="#3fa565" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <circle r="5.5" fill="#ee4266" stroke={INK} strokeWidth="1" />
                  <path d="M-2.5 -1 Q0 -4 2.5 -1 Q0 2 -2.5 -1" fill="#ff8fab" />
                </motion.svg>
              )
            })}
          </Pin>
        </>
      )}
    </>
  )
}

/** A turn without points: the beam swings away from the avatar. */
function SpotlightBlank({ step, stage }: SceneProps<'blank'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  return <StageLight at={at} delay={step.at} length={step.length} away />
}

// -------------------------------------------------------------- Land Grab

/** When a plot changes hands: once the catapult stone has landed, if one flies. */
const stoneLands = (stage: Stage, step: { at: number; length: number }): number =>
  stage.story?.chain.some((beat) => beat.kind === 'attacked') ? step.at + step.length * 0.6 : step.at

/** A plot is yours: a flag in your colour goes up on it. */
function LandClaimed(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const at = segmentOf(stage)
  const delay = stoneLands(stage, step)
  const size = stage.boardScale() * 0.34
  return (
    <>
      <Scored {...props} step={{ ...step, at: delay }} />
      {at && (
        <>
          <Pin at={at}>
            <motion.svg
              className="fx-flag"
              viewBox="-4 -30 26 32"
              style={{ width: size }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1.3, 1, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: step.length + 0.3, delay, times: [0, 0.25, 0.4, 1], ease: 'easeOut', opacity: { duration: step.length + 0.3, delay, times: [0, 0.15, 0.8, 1] } }}
            >
              <path d="M0 0 V-28" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
              <motion.path
                d="M0 -28 L20 -22 L0 -15 Z"
                fill={stage.colourOf(step.scene.player)}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
                animate={{ skewY: [0, 8, -6, 0] }}
                transition={{ duration: 0.5, delay: delay + 0.2, repeat: 1 }}
              />
            </motion.svg>
          </Pin>
          <Burst at={at} delay={delay} colours={['#e7d3ae', '#ffffff']} pieces={8} reach={6} length={0.5} />
        </>
      )}
    </>
  )
}

/** A second wall, built stone by stone. */
function LandFortified({ step, stage }: SceneProps<'fortified'>): React.JSX.Element | null {
  const at = segmentOf(stage)
  if (!at) return null
  const stone = stage.boardScale() * 0.07
  return (
    <Pin at={{ x: at.x, y: at.y + stone }}>
      {[-1.5, -0.5, 0.5, 1.5].map((slot, n) => (
        <motion.i
          key={slot}
          className="fx-stone"
          style={{ width: stone, height: stone * 0.8 }}
          initial={{ x: slot * stone * 1.1, y: -stone * 5, opacity: 0 }}
          animate={{ y: [-stone * 5, 0, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: step.length + 0.2, delay: step.at + n * (step.length / 6), times: [0, 0.3, 1], ease: 'easeIn', opacity: { duration: step.length + 0.2, delay: step.at + n * (step.length / 6), times: [0, 0.15, 0.8, 1] } }}
        />
      ))}
    </Pin>
  )
}

/** A stone flies from the attacker's avatar to the castle and cracks its wall. */
function LandAttacked({ step, stage }: SceneProps<'attacked'>): React.JSX.Element | null {
  const from = stage.avatar(step.scene.by)
  const to = segmentOf(stage)
  const flight = step.length * 0.6
  useNudge(stage.boardElement, SHAKE, step.at + flight, 260, stage.calm)
  if (!from || !to) return null
  const lift = unit() * 18
  return (
    <>
      <Pin at={from}>
        <motion.i
          className="fx-boulder"
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: [0, (to.x - from.x) / 2, to.x - from.x],
            y: [0, (to.y - from.y) / 2 - lift, to.y - from.y],
            opacity: [0, 1, 1, 0],
            rotate: 360,
          }}
          transition={{ duration: flight, delay: step.at, ease: 'easeIn', opacity: { duration: flight + 0.05, delay: step.at, times: [0, 0.1, 0.95, 1] } }}
        />
      </Pin>
      <Pow at={to} size={stage.boardScale() * 0.5} delay={step.at + flight} />
      <Burst at={to} delay={step.at + flight} colours={['#cfc4ad', '#8a8496']} pieces={7} reach={5} length={0.45} />
    </>
  )
}

/** The wall comes down and the old flag drops. */
function LandLost(props: SceneProps<'lost'>): React.JSX.Element {
  const { step, stage } = props
  const at = segmentOf(stage)
  const delay = stoneLands(stage, step)
  return (
    <>
      <Lost {...props} step={{ ...step, at: delay }} />
      {at && (
        <>
          <Burst at={at} delay={delay} colours={['#cfc4ad', '#f3ead7', '#8a8496']} pieces={14} reach={9} length={0.7} />
          <Pin at={at}>
            <motion.svg
              className="fx-flag"
              viewBox="-4 -30 26 32"
              style={{ width: stage.boardScale() * 0.3 }}
              initial={{ rotate: 0, y: 0, opacity: 1 }}
              animate={{ rotate: 110, y: stage.boardScale() * 0.3, opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, delay, ease: 'easeIn' }}
            >
              <path d="M0 0 V-28" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M0 -28 L20 -22 L0 -15 Z" fill={stage.colourOf(step.scene.player)} stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
            </motion.svg>
          </Pin>
        </>
      )}
    </>
  )
}

// ----------------------------------------------------------------- Sniper

/** A number that counts up to `to`. */
function useCount(to: number, delay: number, duration: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let frame = 0
    const begin = performance.now() + delay * 1000
    const tick = (now: number): void => {
      const done = Math.min(1, Math.max(0, (now - begin) / (duration * 1000)))
      setValue(Math.round(to * done))
      if (done < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Counted once, when the step appears.
  }, [])
  return value
}

/** A new round: the cross drops in like a scope locking on. */
function SniperScope({ step, stage }: SceneProps<'round'>): React.JSX.Element | null {
  const view = stage.view as SniperView | null
  const at = view?.target ? stage.boardXY(view.target) : null
  if (!at) return null
  return (
    <Pin at={at}>
      <motion.svg
        className="fx-scope"
        viewBox="-20 -20 40 40"
        style={{ width: stage.boardScale() * 0.7 }}
        initial={{ scale: 5, rotate: -90, opacity: 0 }}
        animate={{ scale: [5, 1, 1.25, 1, 1], rotate: [-90, 0, 0, 0, 0], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: step.length, delay: step.at, times: [0, 0.5, 0.62, 0.74, 1], ease: 'easeOut' }}
      >
        <circle r="15" fill="none" stroke="#ff2d55" strokeWidth="2" />
        <circle r="8" fill="none" stroke="#ff2d55" strokeWidth="1" />
        <path d="M0 -19 V-10 M0 19 V10 M-19 0 H-10 M19 0 H10" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round" />
      </motion.svg>
    </Pin>
  )
}

/** A dotted line measures from the dart to the cross while the millimetres count up. */
function SniperMeasured({ step, stage }: SceneProps<'measured'>): React.JSX.Element | null {
  const from = stage.dartPoint()
  const to = stage.boardXY(step.scene.target)
  const draw = step.length * 0.55
  const mm = useCount(Math.round(step.scene.mm), step.at, draw)
  if (!from || !to) return null
  const colour = stage.colourOf(step.scene.player)
  return (
    <>
      <svg className="fx-overlay">
        <motion.line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={colour}
          strokeWidth={unit() * 0.7}
          strokeDasharray={`${unit() * 1.2} ${unit() * 1.2}`}
          strokeLinecap="round"
          initial={{ x2: from.x, y2: from.y, opacity: 1 }}
          animate={{ x2: to.x, y2: to.y, opacity: [1, 1, 0] }}
          transition={{
            x2: { duration: draw, delay: step.at, ease: 'easeOut' },
            y2: { duration: draw, delay: step.at, ease: 'easeOut' },
            opacity: { duration: step.length + 0.4, delay: step.at, times: [0, 0.8, 1] },
          }}
        />
      </svg>
      <Pin at={{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - unit() * 5 }}>
        <motion.b
          className="fx-number fx-number--small"
          style={{ color: colour }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1.2, 1] }}
          transition={{ duration: step.length + 0.4, delay: step.at, times: [0, 0.15, 0.6, 1] }}
        >
          {mm} mm
        </motion.b>
      </Pin>
    </>
  )
}

const MEDALS = ['#ffd23f', '#d9d6e4', '#cd7f32']

/** The round is over: gold, silver and bronze rings on the closest darts. */
function SniperMedals({ step, stage }: SceneProps<'roundResult'>): React.JSX.Element {
  const { places } = step.scene
  return (
    <>
      {places.map((place, n) => {
        const at = stage.boardXY(place.at)
        if (!at) return null
        // Bronze first, gold last.
        const delay = step.at + (places.length - 1 - n) * (step.length * 0.2)
        return (
          <Pin key={place.player} at={at}>
            <motion.i
              className="fx-ring fx-ring--medal"
              style={{ borderColor: MEDALS[n], boxShadow: `0 0 2vmin ${MEDALS[n]}` }}
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: [3, 1, 1.2, 1, 1], opacity: [0, 1, 1, 1, 0] }}
              transition={{ duration: step.length - (delay - step.at) + 0.3, delay, times: [0, 0.25, 0.35, 0.45, 1], ease: 'easeOut' }}
            />
            <motion.b
              className="fx-number fx-number--small"
              style={{ color: MEDALS[n], marginTop: '-6vmin' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: step.length - (delay - step.at) + 0.3, delay, times: [0, 0.25, 0.8, 1] }}
            >
              {n + 1}
            </motion.b>
          </Pin>
        )
      })}
    </>
  )
}

// -------------------------------------------------------------- Minefield

/** A shovel digs the segment open; then what was under it shows itself. */
function MinefieldDug({ step, stage }: SceneProps<'dug'>): React.JSX.Element | null {
  const at = stage.segmentPoint(step.scene.segment)
  if (!at) return null
  const { found } = step.scene
  const size = stage.boardScale() * 0.42
  const up = step.at + DIG_TIME
  const rest = step.length - DIG_TIME
  return (
    <>
      <Pin at={at}>
        <motion.svg
          className="fx-shovel"
          viewBox="-14 -30 28 34"
          style={{ width: size }}
          initial={{ rotate: -30, y: -size * 0.3, opacity: 0 }}
          animate={{ rotate: [-30, 15, -30, 15, -30], y: [-size * 0.3, 0, -size * 0.3, 0, -size * 0.3], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: DIG_TIME + 0.1, delay: step.at, ease: 'easeInOut' }}
        >
          <path d="M0 -28 V-6" stroke="#b98a5a" strokeWidth="3" strokeLinecap="round" />
          <path d="M-5 -28 H5" stroke="#b98a5a" strokeWidth="3" strokeLinecap="round" />
          <path d="M-7 -7 H7 V0 Q0 6 -7 0 Z" fill="#9a97a6" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        </motion.svg>
      </Pin>
      {[0.1, 0.3].map((wait) => (
        <Burst key={wait} at={at} delay={step.at + wait} colours={['#8a5a33', '#c9a56b']} pieces={6} reach={5} length={0.35} />
      ))}
      {found === 'chest' && (
        <>
          <Pin at={at}>
            <motion.i
              className="fx-ring fx-ring--gold"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 3, opacity: [0, 1, 0] }}
              transition={{ duration: rest, delay: up, ease: 'easeOut' }}
            />
            <motion.svg
              className="fx-chest"
              viewBox="-16 -20 32 32"
              style={{ width: size * 1.3 }}
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1, 1], y: [0, -size * 0.5, -size * 0.4, -size * 0.4], opacity: [0, 1, 1, 0] }}
              transition={{ duration: rest + 0.3, delay: up, times: [0, 0.25, 0.4, 1], ease: 'easeOut', opacity: { duration: rest + 0.3, delay: up, times: [0, 0.15, 0.8, 1] } }}
            >
              <rect x="-13" y="-4" width="26" height="14" rx="2" fill="#b0702c" stroke={INK} strokeWidth="1.4" />
              <rect x="-13" y="-1" width="26" height="3" fill="#ffd23f" />
              <motion.path
                d="M-13 -4 Q-13 -14 0 -14 Q13 -14 13 -4 Z"
                fill="#c98838"
                stroke={INK}
                strokeWidth="1.4"
                style={{ transformOrigin: '-13px -4px' }}
                animate={{ rotate: [0, -55] }}
                transition={{ duration: 0.25, delay: up + 0.2 }}
              />
              <circle cy="2" r="2.4" fill="#ffd23f" stroke={INK} strokeWidth="1" />
            </motion.svg>
          </Pin>
          <Burst at={{ x: at.x, y: at.y - size * 0.4 }} delay={up + 0.25} colours={['#ffd23f', '#fff3b0', '#e0a90f']} pieces={12} reach={11} length={0.8} />
        </>
      )}
      {found === 'coin' && (
        <Pin at={at}>
          <motion.i
            className="fx-coin"
            initial={{ y: 0, opacity: 0, rotateY: 0 }}
            animate={{ y: [0, -size * 1.1, 0], opacity: [0, 1, 1, 0], rotateY: 720 }}
            transition={{ duration: rest, delay: up, ease: 'easeOut', opacity: { duration: rest, delay: up, times: [0, 0.1, 0.85, 1] } }}
          />
        </Pin>
      )}
      {found === 'empty' && (
        <Pin at={at}>
          <motion.svg
            className="fx-crab"
            viewBox="-16 -10 32 20"
            style={{ width: size }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: [0, size * 0.5, size * 1.4], y: [0, -size * 0.1, 0, -size * 0.1, 0], opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: rest + 0.3, delay: up, ease: 'linear' }}
          >
            <path d="M-9 4 L-14 8 M-8 6 L-11 10 M9 4 L14 8 M8 6 L11 10" stroke="#c0392b" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M-8 -2 L-13 -7 M8 -2 L13 -7" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="-13" cy="-7" r="2.6" fill="#ee4266" stroke={INK} strokeWidth="0.8" />
            <circle cx="13" cy="-7" r="2.6" fill="#ee4266" stroke={INK} strokeWidth="0.8" />
            <ellipse rx="9" ry="6" cy="1" fill="#ee4266" stroke={INK} strokeWidth="1.1" />
            <circle cx="-3" cy="-4" r="1.5" fill="#fff" stroke={INK} strokeWidth="0.6" />
            <circle cx="3" cy="-4" r="1.5" fill="#fff" stroke={INK} strokeWidth="0.6" />
          </motion.svg>
        </Pin>
      )}
      {found === 'bomb' && (
        <>
          <Pow at={at} size={size * 2.2} delay={up} length={0.4} />
          <Burst at={at} delay={up} colours={FIRE} pieces={14} reach={12} length={0.7} />
        </>
      )}
    </>
  )
}

// -------------------------------------------------------- Higher or Lower

/** Right: the arrow turns green and shoots onward. Wrong: it breaks in two. */
function CallResult({ step, stage }: SceneProps<'call'>): React.JSX.Element | null {
  const at = stage.prop('call') ?? stage.board()
  if (!at) return null
  const { call, right } = step.scene
  const way = call === 'higher' ? -1 : 1
  const width = unit() * 13
  if (right) {
    return (
      <>
        <Pin at={at}>
          <motion.div
            style={{ width, height: width * 1.2 }}
            initial={{ y: 0, scale: 0.8, opacity: 0 }}
            animate={{ y: [0, way * unit() * 6, way * unit() * 60], scale: [0.8, 1.3, 1], opacity: [0, 1, 0] }}
            transition={{ duration: step.length, delay: step.at, times: [0, 0.3, 1], ease: 'easeIn' }}
          >
            <CallArrow call={call} colour="#3bceac" />
          </motion.div>
        </Pin>
        <Sparkles at={{ ...at, size: unit() * 12 }} colour="#3bceac" delay={step.at} />
      </>
    )
  }
  return (
    <Pin at={at}>
      {[-1, 1].map((side) => (
        <motion.div
          key={side}
          style={{ width, height: width * 1.2, clipPath: side === -1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.8 }}
          animate={{
            x: [0, 0, side * width * 0.6],
            y: [0, 0, unit() * 16],
            rotate: [0, 0, side * 40],
            opacity: [0, 1, 1, 0],
            scale: [0.8, 1.3, 1],
          }}
          transition={{ duration: step.length + 0.2, delay: step.at, times: [0, 0.3, 1], ease: 'easeIn', opacity: { duration: step.length + 0.2, delay: step.at, times: [0, 0.15, 0.8, 1] } }}
        >
          <CallArrow call={call} colour="#ee4266" />
        </motion.div>
      ))}
    </Pin>
  )
}

// ---------------------------------------------------------- Raise the Bar

/**
 * The jump: over the bar in an arc and a coin for the pot, or into the bar,
 * which comes down with the jumper.
 */
function BarJump({ step, stage }: SceneProps<'jump'>): React.JSX.Element | null {
  const set_ = stage.propElement('jump')?.getBoundingClientRect()
  const pot = stage.prop('pot')
  const landing = step.at + step.length * 0.7
  useNudge(() => stage.propElement('pot'), POP, landing, 300, !step.scene.cleared)
  if (!set_) return null
  const { player, cleared } = step.scene
  const size = set_.width * 0.24
  const from = { x: set_.left + set_.width * 0.15, y: set_.bottom - size * 0.6 }
  const over = { x: set_.left + set_.width * 0.55, y: set_.top - size * 0.2 }
  const down = { x: set_.left + set_.width * 0.9, y: set_.bottom - size * 0.6 }
  const bar = { x: set_.left + set_.width * 0.55, y: set_.top + set_.height * 0.45 }
  return (
    <>
      <Pin at={from}>
        <motion.div
          style={{ width: size, height: size }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={
            cleared
              ? { x: [0, over.x - from.x, down.x - from.x], y: [0, over.y - from.y, down.y - from.y], rotate: [0, 180, 360], opacity: [0, 1, 1, 0] }
              : { x: [0, bar.x - from.x, bar.x - from.x], y: [0, bar.y - from.y, down.y - from.y], rotate: [0, 40, 200], opacity: [0, 1, 1, 0] }
          }
          transition={{ duration: step.length, delay: step.at, ease: 'easeInOut', opacity: { duration: step.length + 0.2, delay: step.at, times: [0, 0.1, 0.9, 1] } }}
        >
          <Avatar avatar={stage.avatarOf(player)} mood={cleared ? 'cheer' : 'shocked'} />
        </motion.div>
      </Pin>
      {cleared && pot && (
        <Pin at={{ x: pot.x, y: pot.y - pot.size * 0.4 }}>
          <motion.i
            className="fx-coin"
            initial={{ y: -unit() * 22, opacity: 0, rotateY: 0 }}
            animate={{ y: 0, opacity: [0, 1, 1, 0], rotateY: 540 }}
            transition={{ duration: step.length * 0.5, delay: step.at + step.length * 0.3, ease: 'easeIn' }}
          />
        </Pin>
      )}
      {cleared && <Sparkles at={{ ...over, size: unit() * 14 }} colour={stage.colourOf(player)} delay={step.at + step.length * 0.4} />}
      {!cleared && (
        <>
          <Pin at={bar}>
            <motion.i
              className="fx-bar"
              style={{ width: set_.width * 0.46 }}
              initial={{ y: 0, rotate: 0, opacity: 0 }}
              animate={{ y: [0, 0, set_.height * 0.5], rotate: [0, 0, 24], opacity: [0, 1, 1, 0] }}
              transition={{ duration: step.length, delay: step.at, times: [0, 0.45, 1], ease: 'easeIn', opacity: { duration: step.length + 0.2, delay: step.at, times: [0, 0.05, 0.85, 1] } }}
            />
          </Pin>
          <Pow at={bar} size={size * 1.4} delay={step.at + step.length * 0.45} />
        </>
      )}
    </>
  )
}

/** The pot goes to the holder: coins fly from it to their score. */
function PotWon(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const from = stage.prop('pot')
  const to = stage.score(step.scene.player)
  const delay = step.at + step.length * 0.4
  return (
    <>
      <Scored {...props} step={{ ...step, at: delay }} />
      {from && to && (
        <Pin at={from}>
          {Array.from({ length: Math.min(5, step.scene.amount + 1) }, (_, n) => (
            <motion.i
              key={n}
              className="fx-coin"
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: [0, (to.x - from.x) / 2, to.x - from.x], y: [0, (to.y - from.y) / 2 - unit() * 12, to.y - from.y], opacity: [0, 1, 1, 0], rotateY: 720 }}
              transition={{ duration: step.length * 0.8, delay: delay + n * 0.07, ease: 'easeInOut' }}
            />
          ))}
        </Pin>
      )}
    </>
  )
}

/** Which of the general animations each of these games replaces. */
export const gameShowGames: Record<string, Partial<AnimationSet>> = {
  race: { scored: RaceForward, attacked: RacePushed, won: RaceWon },
  robinHood: { impact: ArrowLands, bad: TreeMiss, spectacle: SplitArrow },
  spotlight: { round: SpotlightSweep, scored: SpotlightBow, blank: SpotlightBlank },
  landGrab: { scored: LandClaimed, fortified: LandFortified, attacked: LandAttacked, lost: LandLost },
  sniper: { round: SniperScope, measured: SniperMeasured, roundResult: SniperMedals },
  minefield: { dug: MinefieldDug, exploded: Exploded },
  higherOrLower: { call: CallResult },
  raiseTheBar: { jump: BarJump, scored: PotWon },
}
