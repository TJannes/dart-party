import { motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { strings } from '../../../shared/strings'
import type { AnimationPack, SceneProps, Spot } from '../animation/pack'
import { blowTimes } from '../animation/timeline'
import { Avatar } from '../components/Avatar'
import { Bomb, Glove } from './gameShowProps'

// How the default theme draws the moments: simple shapes, moved with
// `motion`. Everything is drawn here; there are no image files. Each
// component gets the step it plays (when it starts, how long it may take)
// and the stage (where the avatars, scores and board are on screen).

const t = strings.animations

/** One hundredth of the smaller side of the window, in pixels. */
export const unit = (): number => Math.min(window.innerWidth, window.innerHeight) / 100

/** Puts its children with their centre on a point of the screen. */
export function Pin({ at, children }: { at: { x: number; y: number }; children: ReactNode }): React.JSX.Element {
  return (
    <div className="fx-pin" style={{ left: at.x, top: at.y }}>
      {children}
    </div>
  )
}

/** Runs a Web Animation on an element of the scene itself, after a delay. */
export function useNudge(element: () => Element | null, frames: Keyframe[], delay: number, duration: number, skip = false): void {
  useEffect(() => {
    if (skip) return
    const timer = setTimeout(() => element()?.animate(frames, { duration, easing: 'ease-out' }), delay * 1000)
    return () => clearTimeout(timer)
    // Played once, when the step appears.
  }, [])
}

export const SHAKE: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(0.6%, -0.5%)' },
  { transform: 'translate(-0.5%, 0.4%)' },
  { transform: 'translate(0.3%, 0.2%)' },
  { transform: 'translate(0, 0)' },
]
export const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }]
const PULSE: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.09)' },
  { transform: 'scale(1)' },
  { transform: 'scale(1.06)' },
  { transform: 'scale(1)' },
]

export const STAR = 'M0 -10 L2.9 -3.1 L10 -3.1 L4.4 1.6 L6.4 9 L0 4.6 L-6.4 9 L-4.4 1.6 L-10 -3.1 L-2.9 -3.1 Z'
const HEART = 'M12 21 C5 15 2 11 2 7.5 A5 5 0 0 1 12 6 A5 5 0 0 1 22 7.5 C22 11 19 15 12 21 Z'
const POW = 'M0 -12 L3 -5 L10 -8 L6 -1 L12 2 L5 4 L7 11 L0 6 L-7 11 L-5 4 L-12 2 L-6 -1 L-10 -8 L-3 -5 Z'
export const FIRE = ['#ffd23f', '#f08a4b', '#ee4266', '#ffffff']
const WIGGLE: Keyframe[] = [
  { transform: 'rotate(0deg) scale(1)' },
  { transform: 'rotate(-7deg) scale(1.08)' },
  { transform: 'rotate(6deg) scale(1.04)' },
  { transform: 'rotate(-3deg) scale(1)' },
  { transform: 'rotate(0deg) scale(1)' },
]
const CRUNCH: Keyframe[] = [
  { transform: 'translate(0, 0) scale(1, 1)' },
  { transform: 'translate(0, 8%) scale(1.14, 0.8)' },
  { transform: 'translate(-3%, 0) scale(0.96, 1.05)' },
  { transform: 'translate(3%, 0) scale(1, 1)' },
  { transform: 'translate(0, 0) scale(1, 1)' },
]
const BIG_SHAKE: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(1.4%, -1.1%)' },
  { transform: 'translate(-1.2%, 0.9%)' },
  { transform: 'translate(0.9%, 0.6%)' },
  { transform: 'translate(-0.5%, -0.4%)' },
  { transform: 'translate(0, 0)' },
]
const HIDDEN: Keyframe[] = [{ opacity: 0 }, { opacity: 0 }]
export const CONFETTI = ['#ee4266', '#ffd23f', '#3bceac', '#4d9de0', '#f08a4b', '#b388eb']

/** Pieces flying out from a point in all directions. */
export function Burst(props: {
  at: { x: number; y: number }
  delay: number
  colours: readonly string[]
  pieces?: number
  reach?: number
  length?: number
  /** Seconds to wait before going off again; once without it. */
  repeatDelay?: number
}): React.JSX.Element {
  const pieces = props.pieces ?? 12
  const reach = (props.reach ?? 16) * unit()
  return (
    <Pin at={props.at}>
      {Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * 2 * Math.PI + (i % 2) * 0.3
        const far = reach * (0.7 + ((i * 7) % 5) / 12)
        return (
          <motion.i
            key={i}
            className="fx-piece"
            style={{ background: props.colours[i % props.colours.length] }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: Math.cos(angle) * far,
              y: [0, Math.sin(angle) * far, Math.sin(angle) * far + reach * 0.35],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.2, 0.8],
              rotate: 360,
            }}
            transition={{
              duration: props.length ?? 0.9,
              delay: props.delay,
              ease: 'easeOut',
              ...(props.repeatDelay === undefined ? {} : { repeat: Infinity, repeatDelay: props.repeatDelay }),
            }}
          />
        )
      })}
    </Pin>
  )
}

/** A short white flash over the whole screen. */
export function Flash({ delay, strength = 0.35 }: { delay: number; strength?: number }): React.JSX.Element {
  return (
    <motion.div
      className="fx-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, strength, 0] }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    />
  )
}

// ----------------------------------------------------------------- scenes

function Impact({ step, stage }: SceneProps<'impact'>): React.JSX.Element | null {
  const { dart } = step.scene.story
  const at = stage.boardPoint(dart)
  useNudge(stage.boardElement, SHAKE, step.at, 260, stage.calm || dart.miss)
  if (!at) return null
  return (
    <Pin at={at}>
      {[0, 0.12].map((wait) => (
        <motion.i
          key={wait}
          className={dart.miss ? 'fx-ring fx-ring--miss' : 'fx-ring'}
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 2.6, opacity: [0, 1, 0] }}
          transition={{ duration: step.length, delay: step.at + wait, ease: 'easeOut' }}
        />
      ))}
    </Pin>
  )
}

function Good({ step, stage }: SceneProps<'good'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  return <Sparkles at={at} colour={stage.colourOf(step.scene.player)} delay={step.at} />
}

export function Sparkles({ at, colour, delay }: { at: Spot; colour: string; delay: number }): React.JSX.Element {
  const reach = at.size * 0.85
  return (
    <Pin at={at}>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * 2 * Math.PI - Math.PI / 2
        return (
          <motion.svg
            key={i}
            className="fx-star"
            viewBox="-11 -11 22 22"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, scale: [0, 1.2, 0], opacity: [0, 1, 0], rotate: 180 }}
            transition={{ duration: 0.8, delay: delay + i * 0.03, ease: 'easeOut' }}
          >
            <path d={STAR} fill={colour} stroke="#fff" strokeWidth="1.5" />
          </motion.svg>
        )
      })}
    </Pin>
  )
}

function Great({ step, stage }: SceneProps<'great'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  const colour = stage.colourOf(step.scene.player)
  return (
    <>
      {!stage.calm && <Flash delay={step.at} strength={0.28} />}
      <Burst at={at} delay={step.at} colours={[colour, '#ffffff', '#ffd23f']} pieces={16} reach={14} />
      <Sparkles at={at} colour={colour} delay={step.at + 0.1} />
    </>
  )
}

/** A small rain cloud over a thrower who missed. Teasing, so not when calm. */
export function Bad({ step, stage }: SceneProps<'bad'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  return (
    <Pin at={{ x: at.x, y: at.y - at.size * 0.75 }}>
      <motion.svg
        className="fx-cloud"
        viewBox="0 0 60 44"
        style={{ width: at.size * 1.1 }}
        initial={{ opacity: 0, y: -at.size * 0.3 }}
        animate={{ opacity: [0, 1, 1, 0], y: 0 }}
        transition={{ duration: step.length, delay: step.at, ease: 'easeOut' }}
      >
        <path d="M14 26 A9 9 0 0 1 16 9 A12 12 0 0 1 39 7 A10 10 0 0 1 47 26 Z" fill="#9a97a6" stroke="#5c586b" strokeWidth="1.5" />
        {[18, 30, 42].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 30 l-2 7`}
            stroke="#7fd4ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ y: [0, 5, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.4, delay: step.at + i * 0.1, repeat: 2 }}
          />
        ))}
      </motion.svg>
    </Pin>
  )
}

/** "+3" flies from the dart to the player's score. */
export function Scored({ step, stage }: SceneProps<'scored'>): React.JSX.Element | null {
  const { player, amount } = step.scene
  const to = stage.score(player)
  const from = stage.dartPoint()
  const flight = step.length * 0.8
  useNudge(() => stage.scoreElement(player), POP, step.at + flight, 300)
  if (!to || !from) return null
  return (
    <Pin at={from}>
      <motion.b
        className="fx-number"
        style={{ color: stage.colourOf(player) }}
        initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
        animate={{ x: to.x - from.x, y: to.y - from.y, scale: [0.5, 1.5, 1.5, 0.8], opacity: [0, 1, 1, 0] }}
        transition={{ duration: step.length, delay: step.at, ease: 'easeInOut', times: [0, 0.25, 0.75, 1] }}
      >
        +{amount}
      </motion.b>
    </Pin>
  )
}

/** "−12" drops off the player's score. */
export function Lost({ step, stage }: SceneProps<'lost'>): React.JSX.Element | null {
  const at = stage.score(step.scene.player)
  if (!at) return null
  return (
    <Pin at={at}>
      <motion.b
        className="fx-number fx-number--lost"
        initial={{ y: 0, scale: 0.6, opacity: 0, rotate: 0 }}
        animate={{ y: [0, -unit() * 3, unit() * 14], scale: [0.6, 1.5, 1], opacity: [0, 1, 0], rotate: [0, -6, 14] }}
        transition={{ duration: step.length, delay: step.at, ease: 'easeIn', times: [0, 0.3, 1] }}
      >
        −{step.scene.amount}
      </motion.b>
    </Pin>
  )
}

/** Something flies from the attacker's avatar to the victim's. */
function Attacked({ step, stage }: SceneProps<'attacked'>): React.JSX.Element | null {
  const from = stage.avatar(step.scene.by)
  const to = stage.avatar(step.scene.victim)
  if (!from || !to) return null
  const flight = step.length * 0.6
  const lift = Math.max(unit() * 10, Math.abs(to.y - from.y) * 0.3)
  return (
    <>
      <Pin at={from}>
        <motion.svg
          className="fx-missile"
          viewBox="-11 -11 22 22"
          style={{ width: from.size * 0.7 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, (to.x - from.x) / 2 + lift, to.x - from.x],
            y: [0, (to.y - from.y) / 2, to.y - from.y],
            opacity: [0, 1, 1],
            scale: [0.4, 1.2, 1],
            rotate: 720,
          }}
          transition={{ duration: flight, delay: step.at, ease: 'easeIn' }}
        >
          <path d={STAR} fill={stage.colourOf(step.scene.by)} stroke="#1b0a38" strokeWidth="1.5" />
        </motion.svg>
      </Pin>
      <Pow at={to} size={to.size * 1.5} delay={step.at + flight} length={step.length - flight + 0.15} />
      <Burst at={to} delay={step.at + flight} colours={[stage.colourOf(step.scene.by), '#ffffff']} pieces={8} reach={7} length={0.5} />
    </>
  )
}

/** A heart cracks in two and falls off the player. */
function LifeLost({ step, stage }: SceneProps<'lifeLost'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  const hearts = Math.min(3, Math.max(1, step.scene.amount))
  const size = at.size * 0.8
  const crack = step.length * 0.35
  const half = (side: 1 | -1): React.JSX.Element => (
    <motion.svg
      viewBox="0 0 24 24"
      className="fx-heart"
      style={{ width: size, clipPath: side === -1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}
      initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        scale: [0, 1.3, 1, 1],
        opacity: [0, 1, 1, 0],
        x: [0, 0, 0, side * size * 0.45],
        y: [0, 0, 0, size * 1.1],
        rotate: [0, 0, 0, side * 35],
      }}
      transition={{ duration: step.length, delay: step.at, times: [0, crack / step.length / 2, crack / step.length, 1], ease: 'easeIn' }}
    >
      <path d={HEART} fill="#ee4266" stroke="#fff" strokeWidth="1.5" />
    </motion.svg>
  )
  return (
    <>
      {Array.from({ length: hearts }, (_, i) => (
        <Pin key={i} at={{ x: at.x + (i - (hearts - 1) / 2) * size * 0.9, y: at.y - at.size * 0.55 }}>
          {half(-1)}
          {half(1)}
        </Pin>
      ))}
    </>
  )
}

/** A little ghost leaves the avatar. */
function KnockedOut({ step, stage }: SceneProps<'knockedOut'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  return (
    <Pin at={at}>
      <motion.svg
        className="fx-ghost"
        viewBox="0 0 24 26"
        style={{ width: at.size }}
        initial={{ y: 0, x: 0, opacity: 0, scale: 0.6 }}
        animate={{ y: -at.size * 1.6, x: [0, at.size * 0.15, -at.size * 0.15, 0], opacity: [0, 0.95, 0.95, 0], scale: 1.1 }}
        transition={{ duration: step.length, delay: step.at, ease: 'easeOut' }}
      >
        <path d="M4 24 V11 A8 8 0 0 1 20 11 V24 L17 21 L14.5 24 L12 21 L9.5 24 L7 21 Z" fill="#fff" stroke="#b9b2d6" strokeWidth="1" />
        <circle cx="9.5" cy="11" r="1.6" fill="#2b1055" />
        <circle cx="14.5" cy="11" r="1.6" fill="#2b1055" />
        <ellipse cx="12" cy="15.5" rx="1.6" ry="2.2" fill="#2b1055" />
      </motion.svg>
      <motion.b
        className="fx-tag"
        initial={{ scale: 0, opacity: 0, rotate: -12 }}
        animate={{ scale: [0, 1.3, 1, 1], opacity: [0, 1, 1, 0], rotate: -8 }}
        transition={{ duration: step.length, delay: step.at + 0.1, ease: 'easeOut' }}
      >
        {t.out}
      </motion.b>
    </Pin>
  )
}

function Tumbleweed({ delay, length }: { delay: number; length: number }): React.JSX.Element {
  return (
    <motion.svg
      className="fx-tumbleweed"
      viewBox="-12 -12 24 24"
      initial={{ x: '-20vw', y: 0, rotate: 0 }}
      animate={{ x: '115vw', y: [0, -unit() * 6, 0, -unit() * 4, 0, -unit() * 5, 0], rotate: 900 }}
      transition={{ duration: length, delay, ease: 'linear' }}
    >
      <g fill="none" stroke="#c9a56b" strokeWidth="1.3" strokeLinecap="round">
        <circle r="9" />
        <path d="M-9 0 Q0 -7 9 0 Q0 7 -9 0 M0 -9 Q-7 0 0 9 Q7 0 0 -9 M-6 -6 L6 6 M-6 6 L6 -6" />
        <circle r="5" stroke="#a37f45" />
      </g>
    </motion.svg>
  )
}

/** A banner for a spectacular dart, with something extra per kind. */
export function Spectacle({ step, stage }: SceneProps<'spectacle'>): React.JSX.Element {
  const { what } = step.scene
  const colour = stage.colourOf(step.scene.player)
  const board = stage.board()
  const w = window.innerWidth
  const h = window.innerHeight
  useNudge(stage.boardElement, PULSE, step.at, 700, what !== 'bullseye')
  const fireworks = what === 'oneEighty' ? 6 : what === 'triple20' ? 3 : what === 'hatTrick' ? 2 : 0
  return (
    <>
      {what === 'lastDart' && [0, 0.25].map((wait) => <Flash key={wait} delay={step.at + wait} strength={0.7} />)}
      {what === 'oneEighty' && (
        <motion.div
          className="fx-lights"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: step.length, delay: step.at }}
        />
      )}
      {what === 'bullseye' && board && (
        <Pin at={board}>
          {[0, 0.15, 0.3].map((wait) => (
            <motion.i
              key={wait}
              className="fx-ring fx-ring--gold"
              style={{ width: board.size * 0.3, height: board.size * 0.3 }}
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 3.4, opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: step.at + wait, ease: 'easeOut' }}
            />
          ))}
        </Pin>
      )}
      {Array.from({ length: fireworks }, (_, i) => (
        <Burst
          key={i}
          at={{ x: w * (0.15 + ((i * 0.37) % 0.7)), y: h * (0.2 + ((i * 0.23) % 0.35)) }}
          delay={step.at + i * (step.length / (fireworks + 2))}
          colours={[colour, ...CONFETTI]}
          pieces={14}
          reach={18}
        />
      ))}
      {what === 'threeMisses' && <Tumbleweed delay={step.at} length={step.length} />}
      <div className="fx-centre">
        <motion.strong
          className={what === 'threeMisses' ? 'fx-banner fx-banner--tease' : 'fx-banner'}
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{ scale: [0, 1.25, 1, 1, 1.1], opacity: [0, 1, 1, 1, 0], rotate: [-10, 3, -2, -2, 0] }}
          transition={{ duration: step.length, delay: step.at, times: [0, 0.18, 0.3, 0.8, 1], ease: 'easeOut' }}
        >
          {t.spectacle[what]}
        </motion.strong>
      </div>
    </>
  )
}

/** The winner in the middle of the screen under a confetti cannon. */
export function Won({ step, stage }: SceneProps<'won'>): React.JSX.Element | null {
  const { players } = step.scene
  if (players.length === 0) return null
  const w = window.innerWidth
  const h = window.innerHeight
  const size = `${Math.max(14, 34 - players.length * 5)}vmin`
  return (
    <>
      <motion.div
        className="fx-dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: step.length, delay: step.at, times: [0, 0.12, 0.85, 1] }}
      />
      {[0.25, 0.75].map((x, side) => (
        <Burst
          key={x}
          at={{ x: w * x, y: h * 0.8 }}
          delay={step.at + 0.15 + side * 0.15}
          colours={CONFETTI}
          pieces={22}
          reach={42}
          length={step.length * 0.8}
        />
      ))}
      <div className="fx-centre">
        <motion.div
          className="fx-winner"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: step.length, delay: step.at, times: [0, 0.18, 0.28, 0.85, 1], ease: 'easeOut' }}
        >
          <div className="fx-winner__avatars">
            {players.map((player) => (
              <Avatar key={player} avatar={stage.avatarOf(player)} mood="cheer" size={size} />
            ))}
          </div>
          <strong style={{ color: stage.colourOf(players[0]!) }}>{t.wins(players.map(stage.nameOf))}</strong>
        </motion.div>
      </div>
    </>
  )
}

/** A name banner sweeps past for the next player. */
function Turn({ step, stage }: SceneProps<'turn'>): React.JSX.Element {
  const { player } = step.scene
  return (
    <div className="fx-turn">
      <motion.div
        className="fx-turn__pill"
        style={{ borderColor: stage.colourOf(player) }}
        initial={{ x: '-110vw', opacity: 1 }}
        animate={{ x: ['-110vw', '0vw', '0vw', '110vw'] }}
        transition={{ duration: step.length, delay: step.at, times: [0, 0.25, 0.75, 1], ease: 'easeInOut' }}
      >
        <Avatar avatar={stage.avatarOf(player)} mood="cheer" size="9vmin" />
        <strong>{t.up(stage.nameOf(player))}</strong>
      </motion.div>
    </div>
  )
}

/** Nothing to see in a game that has no drawing of its own for this. */
export function Nothing(): null {
  return null
}

/** A comic-book star where a blow lands. */
export function Pow({ at, size, delay, length = 0.3 }: { at: { x: number; y: number }; size: number; delay: number; length?: number }): React.JSX.Element {
  return (
    <Pin at={at}>
      <motion.svg
        className="fx-pow"
        viewBox="-12 -12 24 24"
        style={{ width: size }}
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: [0, 1.2, 1.4], opacity: [0, 1, 0], rotate: 10 }}
        transition={{ duration: length, delay, ease: 'easeOut' }}
      >
        <path d={POW} fill="#ffd23f" stroke="#ee4266" strokeWidth="1.5" />
      </motion.svg>
    </Pin>
  )
}

/** Two players left: they face each other under a banner. */
function FinalDuel({ step, stage }: SceneProps<'finalDuel'>): React.JSX.Element {
  const [left, right] = step.scene.players
  const fighter = (player: string, from: string): React.JSX.Element => (
    <motion.div
      initial={{ x: from, opacity: 0 }}
      animate={{ x: [from, '0vw', '0vw'], opacity: [0, 1, 1] }}
      transition={{ duration: step.length, delay: step.at, times: [0, 0.25, 1], ease: 'easeOut' }}
    >
      <Avatar avatar={stage.avatarOf(player)} mood="idle" size="24vmin" />
    </motion.div>
  )
  return (
    <>
      <motion.div
        className="fx-dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: step.length, delay: step.at, times: [0, 0.15, 0.85, 1] }}
      />
      <div className="fx-centre">
        <motion.div
          className="fx-duel"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: step.length, delay: step.at, times: [0, 0.1, 0.85, 1] }}
        >
          <div className="fx-duel__pair">
            {fighter(left, '-40vw')}
            <span>{t.versus}</span>
            {fighter(right, '40vw')}
          </div>
          <motion.strong
            className="fx-banner fx-banner--tease"
            style={{ color: 'var(--gold)' }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.4, delay: step.at + step.length * 0.2, ease: 'easeOut' }}
          >
            {t.finalDuel}
          </motion.strong>
        </motion.div>
      </div>
    </>
  )
}

// -------------------------------------------------------------- Time Bomb

/** Where the bomb is on screen: with its holder, else at that avatar. */
const bombSpot = (stage: SceneProps['stage'], player: string): Spot | null => stage.prop('bomb') ?? stage.avatar(player)

/** A dart burned fuse: sparks fly off the bomb and a hot ring spreads. */
function Fuse({ step, stage }: SceneProps<'fuse'>): React.JSX.Element | null {
  const at = bombSpot(stage, step.scene.player)
  if (!at) return null
  const top = { x: at.x + at.size * 0.2, y: at.y - at.size * 0.4 }
  return (
    <>
      <Burst at={top} delay={step.at} colours={FIRE} pieces={6 + Math.min(8, step.scene.burned)} reach={5 + Math.min(6, step.scene.burned)} length={step.length} />
      <Pin at={at}>
        <motion.i
          className="fx-ring"
          style={{ borderColor: '#ee4266', width: at.size, height: at.size }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.9, opacity: [0, 0.9, 0] }}
          transition={{ duration: step.length, delay: step.at, ease: 'easeOut' }}
        />
      </Pin>
    </>
  )
}

/** The bomb is thrown in an arc from one player to the next. */
function Passed({ step, stage }: SceneProps<'passed'>): React.JSX.Element | null {
  const from = stage.avatar(step.scene.from)
  const to = bombSpot(stage, step.scene.to)
  const flight = step.length * 0.75
  // The scene already shows the bomb with the next player: hide it until it lands.
  useEffect(() => {
    const hidden = stage.propElement('bomb')?.animate(HIDDEN, { duration: (step.at + flight) * 1000 })
    return () => hidden?.cancel()
  }, [])
  if (!from || !to) return null
  const lift = unit() * 16
  return (
    <>
      <Pin at={from}>
        <motion.div
          className="fx-prop"
          style={{ width: to.size, height: to.size }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: [0, (to.x - from.x) / 2 + lift, to.x - from.x],
            y: [0, (to.y - from.y) / 2 - lift * 0.4, to.y - from.y],
            rotate: 540,
            opacity: [1, 1, 1, 0],
          }}
          transition={{ duration: flight, delay: step.at, ease: 'easeInOut', opacity: { duration: flight + 0.05, delay: step.at, times: [0, 0.5, 0.98, 1] } }}
        >
          <Bomb />
        </motion.div>
      </Pin>
      <Sparkles at={from} colour={stage.colourOf(step.scene.from)} delay={step.at} />
    </>
  )
}

/** Boom: a flash, a shake, fire and smoke where the holder stands. */
export function Exploded({ step, stage }: SceneProps<'exploded'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  useNudge(() => document.querySelector('.race'), BIG_SHAKE, step.at, 450, stage.calm)
  if (!at) return null
  return (
    <>
      {!stage.calm && <Flash delay={step.at} strength={0.9} />}
      <Burst at={at} delay={step.at} colours={FIRE} pieces={22} reach={26} length={step.length * 0.8} />
      <Burst at={at} delay={step.at + 0.08} colours={['#2a2438', '#6b6678']} pieces={10} reach={15} length={step.length * 0.7} />
      {[-1, 0, 1].map((side) => (
        <Pin key={side} at={{ x: at.x + side * at.size * 0.4, y: at.y - at.size * 0.2 }}>
          <motion.i
            className="fx-smoke"
            initial={{ scale: 0.3, opacity: 0, y: 0 }}
            animate={{ scale: [0.3, 1.6, 2.4], opacity: [0, 0.75, 0], y: -unit() * (9 + side * 2) }}
            transition={{ duration: step.length, delay: step.at + 0.1 + Math.abs(side) * 0.08, ease: 'easeOut' }}
          />
        </Pin>
      ))}
      <Pow at={at} size={at.size * 2.6} delay={step.at} length={0.45} />
      <Pin at={{ x: at.x + at.size * 1.6, y: at.y - at.size * 0.5 }}>
        <motion.b
          className="fx-boom"
          initial={{ scale: 0, opacity: 0, rotate: -14 }}
          animate={{ scale: [0, 1.4, 1, 1], opacity: [0, 1, 1, 0], rotate: [-14, 6, -4, -4] }}
          transition={{ duration: step.length, delay: step.at, times: [0, 0.2, 0.35, 1], ease: 'easeOut' }}
        >
          {t.boom}
        </motion.b>
      </Pin>
    </>
  )
}

// ------------------------------------------------------ Last One Standing

/**
 * A boxing glove on a spring shoots from the attacker to the victim, once
 * per life taken. For your own segment it flies out, turns and comes back.
 */
function Punch({ step, stage }: SceneProps<'attacked'>): React.JSX.Element | null {
  const { by, victim, amount } = step.scene
  const from = stage.avatar(by)
  const to = stage.avatar(victim)
  if (!from || !to) return null
  const blows = blowTimes(step, amount)
  const colour = stage.colourOf(by)
  const pows = blows.map((at, n) => <Pow key={n} at={to} size={to.size * 1.6} delay={at} />)
  const end = step.length + 0.15
  // Where in the animation each blow lands, 0 to 1.
  const landed = blows.map((at) => (at - step.at) / end)

  if (by === victim) {
    const out = unit() * 26
    return (
      <>
        <Pin at={from}>
          <motion.div
            className="fx-spring__glove"
            style={{ position: 'absolute', right: 'auto', top: 0 }}
            initial={{ x: 0, scaleX: 1, opacity: 0 }}
            animate={{ x: [0, out, out, 0, 0], scaleX: [1, 1, -1, -1, -1], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: end, delay: step.at, times: [0, landed[0]! * 0.5, landed[0]! * 0.65, landed[0]!, 1], ease: 'easeInOut' }}
          >
            <Glove colour={colour} />
          </motion.div>
        </Pin>
        {pows}
      </>
    )
  }

  const reach = Math.hypot(to.x - from.x, to.y - from.y)
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
  // Out to the first blow, then back a little and in again for each more.
  const stretch = [0, 1, ...landed.slice(1).flatMap(() => [0.72, 1]), 1, 0]
  const times = [0, landed[0]!, ...landed.slice(1).flatMap((time) => [time - 0.08, time]), Math.min(0.97, landed.at(-1)! + 0.08), 1]
  return (
    <>
      <motion.div
        className="fx-spring"
        style={{ left: from.x, top: from.y, width: reach, rotate: angle }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: stretch }}
        transition={{ duration: end, delay: step.at, times, ease: 'easeOut' }}
      >
        <i className="fx-spring__coil" />
        <div className="fx-spring__glove">
          <Glove colour={colour} />
        </div>
      </motion.div>
      {pows}
    </>
  )
}

/** Counted out: one, two, three, with stars going round the head. */
function CountedOut({ step, stage }: SceneProps<'knockedOut'>): React.JSX.Element | null {
  const at = stage.avatar(step.scene.player)
  if (!at) return null
  const beat = step.length * 0.22
  return (
    <>
      <Pin at={{ x: at.x, y: at.y - at.size * 0.6 }}>
        <motion.div
          className="fx-orbit"
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 540, opacity: [0, 1, 1, 0] }}
          transition={{ duration: step.length + 0.3, delay: step.at, ease: 'linear' }}
        >
          {[0, 1, 2, 3].map((n) => (
            <svg
              key={n}
              viewBox="-11 -11 22 22"
              style={{ left: Math.cos((n * Math.PI) / 2) * at.size * 0.6, top: Math.sin((n * Math.PI) / 2) * at.size * 0.22 }}
            >
              <path d={STAR} fill="#ffd23f" stroke="#b8860b" strokeWidth="1.5" />
            </svg>
          ))}
        </motion.div>
      </Pin>
      <Pin at={{ x: at.x + at.size * 1.3, y: at.y }}>
        {[1, 2, 3].map((count, n) => (
          <motion.b
            key={count}
            className="fx-count"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }}
            transition={{ duration: beat, delay: step.at + n * beat, ease: 'easeOut' }}
          >
            {count}
          </motion.b>
        ))}
        <motion.b
          className="fx-tag"
          style={{ marginTop: 0 }}
          initial={{ scale: 0, opacity: 0, rotate: -12 }}
          animate={{ scale: [0, 1.4, 1, 1], opacity: [0, 1, 1, 0], rotate: -8 }}
          transition={{ duration: step.length - beat * 3 + 0.4, delay: step.at + beat * 3, ease: 'easeOut' }}
        >
          {t.out}
        </motion.b>
      </Pin>
    </>
  )
}

// ------------------------------------------------------------- Piggy Bank

/** The slot on top of the pig, or failing that the player's score. */
const pigSlot = (stage: SceneProps['stage'], player: string): Spot | null => {
  const pig = stage.prop('pig')
  return pig ? { ...pig, y: pig.y - pig.size * 0.42 } : stage.score(player)
}

/** Coins drop from the dart into the pig; one big golden one for a big dart. */
function Coins({ step, stage }: SceneProps<'scored'>): React.JSX.Element | null {
  const { player, amount } = step.scene
  const to = pigSlot(stage, player)
  const from = stage.dartPoint()
  const gold = amount >= 40
  const coins = gold ? 1 : Math.min(5, Math.max(1, Math.ceil(amount / 10)))
  const flight = step.length * 0.6
  const landing = step.at + flight
  useNudge(() => stage.propElement('pig'), WIGGLE, landing, 420)
  useNudge(() => stage.scoreElement(player), POP, landing, 300)
  if (!to || !from) return null
  const lift = unit() * (gold ? 20 : 12)
  return (
    <>
      <Pin at={from}>
        {Array.from({ length: coins }, (_, n) => (
          <motion.i
            key={n}
            className={gold ? 'fx-coin fx-coin--gold' : 'fx-coin'}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotateY: 0 }}
            animate={{
              x: [0, (to.x - from.x) * 0.6, to.x - from.x],
              y: [0, Math.min(0, to.y - from.y) - lift, to.y - from.y],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.1, 0.7],
              rotateY: 720,
            }}
            transition={{ duration: flight, delay: step.at + n * 0.07, ease: 'easeIn', opacity: { duration: flight, delay: step.at + n * 0.07, times: [0, 0.15, 0.92, 1] } }}
          />
        ))}
      </Pin>
      <Pin at={{ x: to.x, y: to.y - unit() * 5 }}>
        <motion.b
          className="fx-number"
          style={{ color: gold ? 'var(--gold)' : stage.colourOf(player) }}
          initial={{ y: 0, scale: 0.5, opacity: 0 }}
          animate={{ y: -unit() * 7, scale: [0.5, gold ? 1.8 : 1.3, 1], opacity: [0, 1, 0] }}
          transition={{ duration: step.length - flight + 0.35, delay: landing, ease: 'easeOut' }}
        >
          +{amount}
        </motion.b>
      </Pin>
      {gold && <Sparkles at={{ ...to, size: unit() * 16 }} colour="#ffd23f" delay={landing} />}
    </>
  )
}

/** A hammer comes down on the pig; with `coins`, that many roll away. */
function HammerBlow(props: { stage: SceneProps['stage']; at: number; length: number; coins: number }): React.JSX.Element | null {
  const { stage, at, length } = props
  const pig = stage.prop('pig')
  const hit = at + length * 0.3
  useNudge(() => stage.propElement('pig'), CRUNCH, hit, 380)
  if (!pig) return null
  const ground = pig.y + pig.size * 0.45
  return (
    <>
      <Pin at={{ x: pig.x - pig.size * 0.35, y: pig.y - pig.size * 0.75 }}>
        <motion.svg
          className="fx-hammer"
          viewBox="0 0 60 60"
          initial={{ rotate: -75, opacity: 0 }}
          animate={{ rotate: [-75, -80, 12, -6, -6], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: length, delay: at, times: [0, 0.14, 0.3, 0.45, 1], ease: 'easeIn' }}
        >
          <rect x="24" y="20" width="7" height="38" rx="3" transform="rotate(35 27 39)" fill="#b98a5a" stroke="#1b0a38" strokeWidth="2" />
          <rect x="2" y="6" width="34" height="18" rx="4" transform="rotate(35 19 15)" fill="#9a97a6" stroke="#1b0a38" strokeWidth="2" />
        </motion.svg>
      </Pin>
      <Pow at={{ x: pig.x, y: pig.y - pig.size * 0.3 }} size={pig.size * 0.9} delay={hit} />
      <Pin at={{ x: pig.x, y: pig.y - pig.size * 0.1 }}>
        <motion.svg
          className="fx-crack"
          viewBox="-12 -12 24 24"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{ duration: length - (hit - at), delay: hit, times: [0, 0.1, 0.7, 1] }}
        >
          <path d="M-1 -12 L3 -5 L-3 -1 L4 4 L-2 8 L1 12" fill="none" stroke="#1b0a38" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        </motion.svg>
      </Pin>
      <Pin at={{ x: pig.x, y: ground }}>
        {Array.from({ length: props.coins }, (_, n) => {
          const side = n % 2 === 0 ? 1 : -1
          const far = side * unit() * (14 + n * 4)
          return (
            <motion.i
              key={n}
              className="fx-coin"
              initial={{ x: 0, y: -pig.size * 0.4, opacity: 0, rotate: 0 }}
              animate={{ x: [0, far * 0.4, far], y: [-pig.size * 0.4, 0, 0], opacity: [0, 1, 1, 0], rotate: side * 540 }}
              transition={{ duration: length - (hit - at) + 0.2, delay: hit + n * 0.03, ease: 'easeOut', opacity: { duration: length - (hit - at) + 0.2, delay: hit + n * 0.03, times: [0, 0.1, 0.75, 1] } }}
            />
          )
        })}
      </Pin>
    </>
  )
}

/** The pig breaks: the hammer, coins rolling away and the loss dropping off. */
function PigBroken(props: SceneProps<'lost'>): React.JSX.Element {
  const { step, stage } = props
  return (
    <>
      <HammerBlow stage={stage} at={step.at} length={step.length} coins={Math.min(6, Math.max(2, Math.ceil(step.scene.amount / 15)))} />
      <Lost {...props} step={{ ...step, at: step.at + step.length * 0.3 }} />
    </>
  )
}

/** Off the board with an empty pig: the hammer still comes down. */
function PigTapped({ step, stage }: SceneProps<'bad'>): React.JSX.Element {
  return <HammerBlow stage={stage} at={step.at} length={step.length} coins={0} />
}

export const gameShowAnimations: AnimationPack = {
  general: {
    impact: Impact,
    good: Good,
    great: Great,
    bad: Bad,
    scored: Scored,
    lost: Lost,
    attacked: Attacked,
    lifeLost: LifeLost,
    knockedOut: KnockedOut,
    finalDuel: FinalDuel,
    // Only Time Bomb has a bomb; it draws these itself.
    fuse: Nothing,
    passed: Nothing,
    exploded: Nothing,
    // What only some games report, and those draw themselves.
    blank: Nothing,
    fortified: Nothing,
    measured: Nothing,
    roundResult: Nothing,
    dug: Nothing,
    call: Nothing,
    jump: Nothing,
    round: Nothing,
    spectacle: Spectacle,
    won: Won,
    turn: Turn,
  },
  // A game's own versions; eight more games are in gameShowGames.tsx.
  games: {
    timeBomb: { fuse: Fuse, passed: Passed, exploded: Exploded },
    lastOneStanding: { attacked: Punch, knockedOut: CountedOut },
    piggyBank: { scored: Coins, lost: PigBroken, bad: PigTapped },
  },
}
