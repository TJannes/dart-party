import { motion } from 'motion/react'
import { useEffect } from 'react'
import type { PlayerId } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { PLAYER_COLOURS } from '../colours'
import { sound } from '../sound'
import { Burst } from '../theme/partyAnimations'
import { Avatar } from './Avatar'

const s = strings.evening

export interface PodiumEntry {
  id: PlayerId
  name: string
  avatar: string
  colour: string
  place: number
  points: number
}

/** Seconds between two places climbing on. */
const CLIMB = 0.9

function Confetti(): React.JSX.Element {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: PLAYER_COLOURS[i % PLAYER_COLOURS.length],
            animationDelay: `${-(i * 0.37) % 4}s`,
            animationDuration: `${3 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  )
}

function Fireworks({ start }: { start: number }): React.JSX.Element {
  const w = window.innerWidth
  const h = window.innerHeight
  return (
    <div className="fx-local" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Burst
          key={i}
          at={{ x: w * (0.12 + ((i * 0.31) % 0.76)), y: h * (0.12 + ((i * 0.19) % 0.3)) }}
          delay={start + i * 0.45}
          colours={PLAYER_COLOURS}
          pieces={16}
          reach={20}
          length={1.1}
          repeatDelay={1.6}
        />
      ))}
    </div>
  )
}

/**
 * The end of the evening: the top three climb onto the blocks one place at
 * a time, third first, and the winner gets the fireworks.
 */
export function PodiumView(props: {
  entries: readonly PodiumEntry[]
  calm: boolean
  buttonLabel: string
  onButton: () => void
}): React.JSX.Element {
  const { entries } = props
  // Second place stands left of the winner, third place right.
  const onPlace = (place: number): PodiumEntry[] => entries.filter((entry) => entry.place === place)
  const blocks = [...onPlace(2), ...onPlace(1), ...onPlace(3)]
  const rest = entries.filter((entry) => entry.place > 3)
  // The lowest place on the blocks climbs first.
  const climbing = [...new Set(blocks.map((entry) => entry.place))].sort((a, b) => b - a)
  const climbAt = (place: number): number => 0.4 + climbing.indexOf(place) * CLIMB
  const winnerAt = climbAt(1) + 0.5

  useEffect(() => {
    const timers = climbing.map((place) =>
      setTimeout(() => sound.play(place === 1 ? 'fanfare' : 'climb'), (climbAt(place) + 0.45) * 1000),
    )
    return () => timers.forEach(clearTimeout)
    // Once, when the podium appears.
  }, [])

  return (
    <main className="screen screen--podium">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: winnerAt, duration: 0.6 }}>
        <Confetti />
      </motion.div>
      {!props.calm && <Fireworks start={winnerAt} />}
      <motion.h2
        className="podium__title"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: winnerAt, type: 'spring', stiffness: 200, damping: 12 }}
      >
        {s.podiumTitle}
      </motion.h2>
      <div className="podium">
        {blocks.map((entry) => (
          <div key={entry.id} className={`podium__spot podium__spot--${entry.place}`}>
            <motion.div
              className="podium__who"
              initial={{ y: '-70vh', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: climbAt(entry.place), type: 'spring', stiffness: 160, damping: 13 }}
            >
              <Avatar avatar={entry.avatar} mood={entry.place === 1 ? 'cheer' : 'idle'} size={entry.place === 1 ? '22vh' : '15vh'} />
              <strong>{entry.name}</strong>
            </motion.div>
            <div className="podium__block" style={{ background: entry.colour }}>
              <span>{entry.place}</span>
              <small>{s.points(entry.points)}</small>
            </div>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <ol className="podium__rest">
          {rest.map((entry) => (
            <li key={entry.id}>
              {s.place(entry.place)} <Avatar avatar={entry.avatar} mood="sulk" size="1.6em" /> {entry.name} ·{' '}
              {s.points(entry.points)}
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="button button--big" onClick={props.onButton}>
        {props.buttonLabel}
      </button>
    </main>
  )
}
