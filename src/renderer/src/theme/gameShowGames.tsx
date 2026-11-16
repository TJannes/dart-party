import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { SniperView } from '../../../core/game/sniper'
import type { SpotlightView } from '../../../core/game/spotlight'
import { RING } from '../../../core/board/ring'
import type { AnimationSet, SceneProps, Spot } from '../animation/pack'
import { DIG_TIME, STONE_FLIGHT } from '../animation/timeline'
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
import { ARCHERY_TREES } from '../components/Board'
import { CallArrow, Catapult, MemoryCard } from './gameShowProps'

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
  // Measured once: the nearest tree of the forest behind the target.
  const [tree] = useState(() => {
    const dart = stage.dartPoint()
    const spots = ARCHERY_TREES.map((spot) => stage.boardXY(spot)).filter((spot) => spot !== null)
    if (!dart || spots.length === 0) return null
    return spots.reduce((best, spot) =>
      Math.hypot(spot.x - dart.x, spot.y - dart.y) < Math.hypot(best.x - dart.x, best.y - dart.y) ? spot : best,
    )
  })
  if (!tree) return null
  const size = stage.boardScale() * 0.5
  // The arrow comes down into the crown from above, over the target: from
  // the left into a tree on the right, and the other way round. Its point
  // is at the origin of the drawing, where `.fx-arrow` pins it.
  const fromLeft = tree.x > (stage.board()?.x ?? tree.x)
  return (
    <>
      {/* The arrow flies into the crown and stays there, quivering. */}
      <Pin at={tree}>
        <motion.svg
          className="fx-arrow"
          viewBox="-4 -34 38 38"
          initial={{ x: (fromLeft ? -1 : 1) * unit() * 30, y: -unit() * 30, opacity: 0, rotate: 0 }}
          animate={{ x: 0, y: 0, opacity: [0, 1, 1, 1, 0], rotate: [0, 0, -10, 8, -5, 3, 0] }}
          transition={{
            x: { duration: 0.14, delay: step.at, ease: 'easeIn' },
            y: { duration: 0.14, delay: step.at, ease: 'easeIn' },
            rotate: { duration: 0.6, delay: step.at + 0.14, ease: 'easeOut' },
            opacity: { duration: step.length + 0.4, delay: step.at, times: [0, 0.08, 0.5, 0.85, 1] },
          }}
        >
          <g transform={fromLeft ? 'scale(-1 1)' : undefined}>
            <Arrow />
          </g>
        </motion.svg>
      </Pin>
      {/* Leaves come down, and a bird has had enough. */}
      <Burst at={tree} delay={step.at + 0.14} colours={['#2f9e6b', '#3fa565', '#23805a']} pieces={10} reach={7} length={0.8} />
      <Pin at={{ x: tree.x, y: tree.y - size * 0.3 }}>
        <motion.svg
          className="fx-bird"
          viewBox="-12 -8 24 16"
          style={{ width: size * 0.7 }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: [0, size * 0.8, size * 2.6], y: [0, -size * 1.2, -size * 2.6], opacity: [0, 1, 1, 0] }}
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
    </>
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

/** A plot is yours: a flag in your colour goes up on it. */
function LandClaimed(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const at = segmentOf(stage)
  // The timeline already waits for a catapult stone to land.
  const delay = step.at
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

/**
 * A stone is launched from the attacker's avatar, flies one arc to the castle
 * and cracks its wall: level at an even pace, up slowing and down speeding.
 */
function LandAttacked({ step, stage }: SceneProps<'attacked'>): React.JSX.Element | null {
  const flight = step.length * STONE_FLIGHT
  useNudge(stage.boardElement, SHAKE, step.at + flight, 260, stage.calm)
  // Measured once. The attacker's avatar moves while it laughs, and a path
  // that changes on a later render makes Motion start the flight over.
  const [arc] = useState(() => {
    const avatar = stage.avatar(step.scene.by)
    const to = segmentOf(stage)
    if (!avatar || !to) return null
    // The catapult rolls up beside the attacker's coat of arms, clear of the
    // name; the stone leaves from the end of its arm.
    const size = avatar.size * 1.5
    const shield = stage.prop(`shield:${step.scene.by}`)
    const engine = shield ? { x: shield.x - size * 0.75, y: shield.y } : { x: avatar.x + avatar.size * 1.3, y: avatar.y }
    const from = { x: engine.x + size * 0.3, y: engine.y - size * 0.45 }
    const dx = to.x - from.x
    const dy = to.y - from.y
    // One arc, as points along a parabola at even steps in time: level at an
    // even pace, rising slower and falling faster as a thrown stone does.
    const lift = unit() * 18 + Math.abs(dy) * 0.25
    const points = Array.from({ length: 13 }, (_, n) => n / 12)
    return {
      from,
      to,
      engine,
      size,
      animate: {
        x: points.map((t) => dx * t),
        y: points.map((t) => dy * t - 4 * lift * t * (1 - t)),
        opacity: [0, 1, 1, 0],
        rotate: [0, 360],
      },
    }
  })
  if (!arc) return null
  const { from, to, engine, size } = arc
  // The arm swings first; the stone still lands when it always did.
  const wind = Math.min(0.18, flight * 0.3)
  return (
    <>
      <Pin at={engine}>
        <motion.div
          style={{ width: size, height: size * 0.8, '--fire': `${step.at + wind - 0.12}s` } as React.CSSProperties}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.1, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: step.length + 0.3, delay: Math.max(0, step.at - 0.1), times: [0, 0.1, 0.18, 0.85, 1] }}
        >
          <Catapult colour={stage.colourOf(step.scene.by)} />
        </motion.div>
      </Pin>
      <Burst at={from} delay={step.at + wind} colours={['#e7d3ae', '#ffffff']} pieces={6} reach={3} length={0.35} />
      <Pin at={from}>
        <motion.i
          className="fx-boulder"
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={arc.animate}
          transition={{
            duration: flight - wind,
            delay: step.at + wind,
            ease: 'linear',
            opacity: { duration: flight - wind + 0.05, delay: step.at + wind, times: [0, 0.06, 0.95, 1] },
          }}
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
  const delay = step.at
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

const RECOIL: Keyframe[] = [
  { transform: 'translateX(0) rotate(0deg)' },
  { transform: 'translateX(-9%) rotate(-5deg)' },
  { transform: 'translateX(0) rotate(0deg)' },
]

/**
 * A dart is a shot: the thrower's rifle kicks back, flame comes from the
 * muzzle and a line of light runs to where the dart is on the board.
 */
function SniperShot({ step, stage }: SceneProps<'impact'>): React.JSX.Element | null {
  const { thrower } = step.scene.story
  const name = `rifle:${thrower}`
  // Measured once, before the recoil moves the rifle.
  const [shot] = useState(() => {
    const box = stage.propElement(name)?.getBoundingClientRect()
    const to = stage.dartPoint()
    if (!box || !to || box.width === 0) return null
    const from = { x: box.right, y: box.top + box.height * 0.5 }
    return {
      from,
      to,
      length: Math.hypot(to.x - from.x, to.y - from.y),
      angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
    }
  })
  useNudge(() => stage.propElement(name), RECOIL, step.at, 220, stage.calm)
  if (!shot) return null
  const size = unit() * 7
  return (
    <>
      <Pin at={shot.from}>
        <motion.i
          className="fx-tracer"
          // Not centred like the rest: it starts at the muzzle.
          style={{ width: shot.length, rotate: shot.angle, translate: '0 -50%' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.32, delay: step.at, times: [0, 0.25, 1], ease: 'easeOut' }}
        />
      </Pin>
      <Pow at={shot.from} size={size} delay={step.at} length={0.22} />
      <Burst at={shot.to} delay={step.at + 0.08} colours={['#fff3b0', '#ffd23f', '#c9c6d6']} pieces={8} reach={5} length={0.4} />
      <Pin at={shot.to}>
        <motion.i
          className="fx-ring"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1.6, opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: step.at + 0.08, ease: 'easeOut' }}
        />
      </Pin>
    </>
  )
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

// ------------------------------------------------------------ Trap Runner

const FALL: Keyframe[] = [
  { transform: 'translateY(0) rotate(0deg) scale(1)' },
  { transform: 'translateY(-30%) rotate(-15deg) scale(1.1)' },
  { transform: 'translateY(-30%) rotate(10deg) scale(1.1)' },
  { transform: 'translateY(70%) rotate(60deg) scale(0.2)', opacity: 0.2 },
  { transform: 'translateY(70%) rotate(60deg) scale(0.2)', opacity: 0 },
  { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: 1 },
]

const SWING: Keyframe[] = [
  { transform: 'rotate(0deg) translateY(0)' },
  { transform: 'rotate(-22deg) translateY(-30%)' },
  { transform: 'rotate(18deg) translateY(-35%)' },
  { transform: 'rotate(0deg) translateY(0)' },
]

/**
 * A step: dust under the runner's feet. The jump on the bull: a vine comes
 * down and the runner swings on it to the next torch.
 */
function TrapStep(props: SceneProps<'scored'>): React.JSX.Element {
  const { step, stage } = props
  const { player, amount } = step.scene
  const at = stage.avatar(player)
  const swing = amount >= 2
  useNudge(() => avatarElement(player), SWING, step.at, step.length * 1000, !swing)
  return (
    <>
      <Scored {...props} />
      {at &&
        [0, 1, 2].map((n) => (
          <Pin key={n} at={{ x: at.x - at.size * 0.3, y: at.y + at.size * 0.4 }}>
            <motion.i
              className="fx-smoke fx-smoke--dust"
              initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
              animate={{ x: -at.size * (0.3 + n * 0.3), y: -at.size * 0.15, scale: [0.2, 0.7, 1], opacity: [0, 0.7, 0] }}
              transition={{ duration: step.length * 0.7, delay: step.at + n * 0.07, ease: 'easeOut' }}
            />
          </Pin>
        ))}
      {at && swing && (
        <Pin at={{ x: at.x, y: at.y - at.size * 1.6 }}>
          <motion.svg
            viewBox="-20 0 40 60"
            style={{ width: at.size * 1.3, overflow: 'visible', transformOrigin: '50% 0%' }}
            initial={{ rotate: -40, opacity: 0, scaleY: 0.2 }}
            animate={{ rotate: [-40, -25, 30, 40], opacity: [0, 1, 1, 0], scaleY: [0.2, 1, 1, 0.6] }}
            transition={{ duration: step.length, delay: step.at, ease: 'easeInOut' }}
          >
            <path d="M0 0 Q5 20 0 40 Q-3 50 0 58" fill="none" stroke="#2f9e6b" strokeWidth="4" strokeLinecap="round" />
            <path d="M2 12 l7 -3 M-1 26 l-8 -2 M1 40 l7 2 M-1 52 l-6 3" stroke="#3bceac" strokeWidth="4" strokeLinecap="round" />
          </motion.svg>
        </Pin>
      )}
    </>
  )
}

/** Out of the temple: daylight floods in from the exit of the winner's corridor. */
function TrapEscaped(props: SceneProps<'won'>): React.JSX.Element {
  const { step, stage } = props
  const winner = step.scene.players[0]
  const at = winner ? stage.avatar(winner) : null
  return (
    <>
      {!stage.calm && <Flash delay={step.at} strength={0.7} />}
      {at && (
        <>
          <Pin at={at}>
            <motion.i
              className="fx-ring fx-ring--gold"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 9, opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, delay: step.at, ease: 'easeOut' }}
            />
          </Pin>
          <Burst at={at} delay={step.at + 0.05} colours={['#ffd23f', '#fff3b0', '#3bceac', '#2f9e6b']} pieces={18} reach={20} length={1} />
        </>
      )}
      <Won {...props} />
    </>
  )
}

/** A pit with spikes, seen a little from above. */
function PitArt(): React.JSX.Element {
  return (
    <>
      <ellipse rx="19" ry="12" fill="#8a5a33" stroke={INK} strokeWidth="1.6" />
      <ellipse rx="15.5" ry="9" fill="#05010d" />
      {[-9, -3, 3, 9].map((x, n) => (
        <path
          key={x}
          d={`M${x - 3} 6 L${x} ${n % 2 === 0 ? -4 : -7} L${x + 3} 6 Z`}
          fill="#e8e4f0"
          stroke={INK}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ))}
      <path d="M-15.5 2 A15.5 9 0 0 0 15.5 2 L19 2 A19 12 0 0 1 -19 2 Z" fill="#8a5a33" stroke={INK} strokeWidth="1.2" />
    </>
  )
}

/**
 * The floor of the segment gives way: two doors drop open over a pit of
 * spikes, the thrower hangs in the air for a beat, looks down, and falls
 * in. On the track the runner drops out of sight and comes back at the
 * rest stop.
 */
function TrapSprung({ step, stage }: SceneProps<'trapped'>): React.JSX.Element | null {
  const { player, segment } = step.scene
  const at = stage.segmentPoint(segment)
  useNudge(() => avatarElement(player), FALL, step.at + 0.3, 900, stage.calm)
  useNudge(() => stage.boardElement(), SHAKE, step.at + 0.1, 350, stage.calm)
  if (!at) return null
  const size = stage.boardScale() * 0.75
  const hang = 0.42
  const total = step.length
  return (
    <>
      {!stage.calm && <Flash delay={step.at + 0.08} strength={0.22} />}
      <Pin at={at}>
        <motion.svg
          viewBox="-24 -24 48 40"
          style={{ width: size, overflow: 'visible' }}
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.25, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: total, delay: step.at, times: [0, 0.14, 0.24, 0.85, 1] }}
        >
          <PitArt />
          {/* The two halves of the lid that covered it fly apart. */}
          {[-1, 1].map((side) => (
            <motion.path
              key={side}
              d={side === -1 ? 'M0 -9 A15.5 9 0 0 0 0 9 Z' : 'M0 -9 A15.5 9 0 0 1 0 9 Z'}
              fill="#b0702c"
              stroke={INK}
              strokeWidth="1.2"
              strokeLinejoin="round"
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: side * 26, y: [0, -10, 8], rotate: side * 70, opacity: [1, 1, 0] }}
              transition={{ duration: 0.45, delay: step.at + 0.12, ease: 'easeOut' }}
            />
          ))}
        </motion.svg>
      </Pin>
      {/* The thrower, small, over the hole: a beat in the air, then down. */}
      <Pin at={at}>
        <motion.div
          style={{ width: size * 0.62, height: size * 0.62 }}
          initial={{ y: -size * 0.25, scale: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: [-size * 0.25, -size * 0.62, -size * 0.62, -size * 0.05],
            scale: [0, 1, 1, 0.15],
            rotate: [0, -8, 8, 200],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: total * 0.85, delay: step.at + 0.1, times: [0, 0.18, hang + 0.18, 1], ease: 'easeIn' }}
        >
          <Avatar avatar={stage.avatarOf(player)} mood="shocked" size="100%" />
        </motion.div>
      </Pin>
      <Burst at={at} delay={step.at + 0.1} colours={['#8a5a33', '#c9a56b', '#5c3b1e']} pieces={12} reach={9} length={0.6} />
      {/* A puff of dust from the bottom of the pit. */}
      {[-1, 0, 1].map((n) => (
        <Pin key={n} at={at}>
          <motion.i
            className="fx-smoke fx-smoke--dust"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
            animate={{ x: n * size * 0.35, y: -size * 0.45, scale: [0.2, 1, 1.4], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.6, delay: step.at + total * 0.8, ease: 'easeOut' }}
          />
        </Pin>
      ))}
    </>
  )
}

/**
 * A new round: the traps move. Three pits with a question mark hop over
 * the board and sink away. Where they hop is made up from the round
 * number, so it says nothing about where the traps really are.
 */
function TrapShuffle({ step, stage }: SceneProps<'round'>): React.JSX.Element | null {
  if (!stage.board()) return null
  const size = stage.boardScale() * 0.5
  const hops = 4
  return (
    <>
      {[0, 1, 2].map((pit) => {
        const stops = Array.from({ length: hops }, (_, hop) => {
          const segment = RING[(step.scene.round * 7 + pit * 5 + hop * (3 + pit * 4)) % RING.length]!
          return stage.segmentPoint(segment)!
        })
        const from = stops[0]!
        return (
          <Pin key={pit} at={from}>
            <motion.svg
              viewBox="-24 -24 48 40"
              style={{ width: size, overflow: 'visible' }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: [...stops.map((stop) => stop.x - from.x), stops.at(-1)!.x - from.x],
                y: [...stops.map((stop) => stop.y - from.y), stops.at(-1)!.y - from.y],
                scale: [0, 1, 1, 1, 0],
                opacity: [0, 1, 1, 1, 0],
              }}
              transition={{ duration: step.length, delay: step.at + pit * 0.05, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
            >
              <PitArt />
              <text y="-12" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ffd23f" stroke={INK} strokeWidth="4" paintOrder="stroke">
                ?
              </text>
            </motion.svg>
          </Pin>
        )
      })}
    </>
  )
}

// ----------------------------------------------------------------- Memory

/**
 * A card turns over on its segment. With a pair, its partner comes up too
 * and both fly to the thrower's score.
 */
function MemoryFlipped({ step, stage }: SceneProps<'flipped'>): React.JSX.Element | null {
  const { segment, picture, match, player } = step.scene
  const at = stage.segmentPoint(segment)
  const partner = match === null ? null : stage.segmentPoint(match)
  const to = stage.score(player)
  if (!at) return null
  const size = stage.boardScale() * 0.36
  const turn = 0.3
  const cards = partner && to ? [at, partner] : [at]
  return (
    <>
      {cards.map((from, n) => (
        <Pin key={n} at={from}>
          <motion.div
            style={{ width: size, height: size * 1.2 }}
            initial={{ scaleX: 0, scale: 0.6, x: 0, y: 0, opacity: 0 }}
            animate={
              partner && to
                ? {
                    scaleX: [0, 1, 1, 1],
                    scale: [0.6, 1.5, 1.5, 0.6],
                    x: [0, 0, 0, to.x - from.x],
                    y: [0, -size * 0.3, -size * 0.3, to.y - from.y],
                    opacity: [0, 1, 1, 0],
                  }
                : { scaleX: [0, 1, 1, 0], scale: [0.6, 1.5, 1.5, 0.6], y: [0, -size * 0.3, -size * 0.3, 0], opacity: [0, 1, 1, 0] }
            }
            transition={{
              duration: step.length,
              delay: step.at,
              times: [0, turn, 0.6, 1],
              ease: 'easeInOut',
            }}
          >
            <MemoryCard picture={picture} />
          </motion.div>
        </Pin>
      ))}
      {partner && (
        <>
          <Sparkles at={{ ...at, size: size * 2 }} colour="#ffd23f" delay={step.at + 0.2} />
          <Sparkles at={{ ...partner, size: size * 2 }} colour="#ffd23f" delay={step.at + 0.2} />
        </>
      )}
    </>
  )
}

// -------------------------------------------------------------- Blackjack

/** The whole table swells a little: it is far bigger than a score. */
const TABLE_POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }]
const CHIPS = ['#ee4266', '#3bceac', '#ffd23f', '#ffffff', '#7fd4ff']

/** Exactly 21: chips fly up from the table and the thrower shines. */
function BlackjackTwentyOne({ step, stage }: SceneProps<'great'>): React.JSX.Element | null {
  const table = stage.prop('hand')
  const at = stage.avatar(step.scene.player)
  useNudge(() => stage.propElement('hand'), TABLE_POP, step.at + 0.15, 350)
  if (!table) return null
  return (
    <>
      {!stage.calm && <Flash delay={step.at} strength={0.28} />}
      <Burst at={table} delay={step.at + 0.15} colours={CHIPS} pieces={22} reach={22} length={1.1} />
      <Sparkles at={{ ...table, size: table.size * 1.4 }} colour="#ffd23f" delay={step.at + 0.25} />
      {at && <Sparkles at={at} colour={stage.colourOf(step.scene.player)} delay={step.at + 0.1} />}
    </>
  )
}

/** Bust: the table takes a knock as the stamp comes down, and the chips are swept away. */
function BlackjackBust({ step, stage }: SceneProps<'blank'>): React.JSX.Element | null {
  const table = stage.prop('hand')
  useNudge(() => stage.propElement('hand'), SHAKE, step.at + 0.15, 400)
  if (!table) return null
  return (
    <>
      <Pow at={table} size={table.size * 1.6} delay={step.at + 0.1} length={0.45} />
      <Pin at={{ x: table.x, y: table.y + table.size * 0.45 }}>
        {CHIPS.slice(0, 4).map((colour, n) => (
          <motion.i
            key={colour}
            className="fx-piece"
            style={{ background: colour, borderRadius: '50%' }}
            initial={{ x: (n - 1.5) * unit() * 3, y: 0, opacity: 0 }}
            animate={{ x: unit() * (28 + n * 4), y: [0, -unit() * 2, unit() * 3], opacity: [0, 1, 1, 0], rotate: 540 }}
            transition={{ duration: step.length * 0.8, delay: step.at + 0.3 + n * 0.05, ease: 'easeIn' }}
          />
        ))}
      </Pin>
    </>
  )
}

/** Which of the general animations each of these games replaces. */
export const gameShowGames: Record<string, Partial<AnimationSet>> = {
  race: { scored: RaceForward, attacked: RacePushed, won: RaceWon },
  robinHood: { impact: ArrowLands, bad: TreeMiss, spectacle: SplitArrow },
  spotlight: { round: SpotlightSweep, scored: SpotlightBow, blank: SpotlightBlank },
  landGrab: { scored: LandClaimed, fortified: LandFortified, attacked: LandAttacked, lost: LandLost },
  sniper: { round: SniperScope, impact: SniperShot, measured: SniperMeasured, roundResult: SniperMedals },
  minefield: { dug: MinefieldDug, exploded: Exploded },
  higherOrLower: { call: CallResult },
  raiseTheBar: { jump: BarJump, scored: PotWon },
  blackjack: { great: BlackjackTwentyOne, blank: BlackjackBust },
  memory: { flipped: MemoryFlipped },
  trapRunner: { scored: TrapStep, won: TrapEscaped, trapped: TrapSprung, round: TrapShuffle },
}
