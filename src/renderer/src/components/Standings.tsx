import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { placesOf } from '../../../core/evening/points'
import { rankByScore, type PlayerId } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { useStageBusy } from '../animation/Stage'
import { sound } from '../sound'
import { Avatar, type Mood } from './Avatar'

const s = strings.evening

export interface StandingsEntry {
  id: PlayerId
  name: string
  avatar: string
  colour: string
  /** Points before the game just finished. */
  before: number
  /** Points earned in it. */
  earned: number
  mood?: Mood
}

function Crown(): React.JSX.Element {
  return (
    <motion.svg
      layoutId="crown"
      className="crown"
      viewBox="0 0 24 16"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      aria-hidden
    >
      <path d="M2 14 L1 4 L7 9 L12 1 L17 9 L23 4 L22 14 Z" fill="#ffd23f" stroke="#b8860b" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1.6" fill="#ee4266" />
    </motion.svg>
  )
}

/**
 * The scoreboard of the evening after a game. When animated it starts as
 * it stood before the game: the points fly in, then the rows move to their
 * new places and the crown hops to whoever leads.
 */
export function Standings(props: { rows: readonly StandingsEntry[]; animate: boolean }): React.JSX.Element {
  // 0: as it was, 1: points added, 2: sorted again.
  const [phase, setPhase] = useState(props.animate ? 0 : 2)
  const busy = useStageBusy()
  // Give the stage a moment to start the animation of the last dart.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const ids = props.rows.map((row) => row.id)
  const totalOf = (when: 'before' | 'after') => (id: PlayerId): number => {
    const row = props.rows.find((r) => r.id === id)!
    return when === 'before' ? row.before : row.before + row.earned
  }
  const leaderOf = (when: 'before' | 'after'): PlayerId | null => {
    const first = rankByScore(ids, totalOf(when))[0] ?? []
    return first.length === 1 && totalOf(when)(first[0]!) > 0 ? first[0]! : null
  }
  const crownMoves = leaderOf('before') !== leaderOf('after')

  useEffect(() => {
    if (phase === 2 || !armed || busy) return
    const timers = [
      setTimeout(() => {
        setPhase(1)
        sound.play('coin')
      }, 200),
      setTimeout(() => {
        setPhase(2)
        if (crownMoves) sound.play('crown')
      }, 1500),
    ]
    return () => timers.forEach(clearTimeout)
    // Runs once the stage is quiet; `phase` moving on must not restart it.
  }, [armed, busy])

  const when = phase < 2 ? 'before' : 'after'
  // A stable sort: level players keep the order they were entered in.
  const order = [...props.rows].sort((a, b) => totalOf(when)(b.id) - totalOf(when)(a.id))
  const places = placesOf(rankByScore(ids, totalOf(when)))
  const leader = leaderOf(when)

  return (
    <ol className="scoreboard">
      {order.map((row, n) => (
        <motion.li
          key={row.id}
          layout
          transition={{ type: 'spring', stiffness: 170, damping: 20 }}
          style={{ borderColor: row.colour }}
        >
          <span className="scoreboard__place">{s.place(places[row.id]!)}</span>
          <span className="scoreboard__avatar">
            {leader === row.id && <Crown />}
            <Avatar avatar={row.avatar} size="2em" mood={row.mood ?? 'idle'} />
          </span>
          <span className="scoreboard__name">{row.name}</span>
          {phase >= 1 ? (
            <motion.span
              className="scoreboard__earned"
              initial={props.animate ? { y: '-2.5em', opacity: 0, scale: 2 } : false}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: n * 0.07 }}
            >
              {s.earned(row.earned)}
            </motion.span>
          ) : (
            <span className="scoreboard__earned" style={{ visibility: 'hidden' }}>
              {s.earned(row.earned)}
            </span>
          )}
          <motion.strong
            key={phase === 0 ? 'before' : 'after'}
            initial={props.animate && phase === 1 ? { scale: 1.6 } : false}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35, delay: 0.25 + n * 0.07 }}
          >
            {s.points(phase === 0 ? row.before : row.before + row.earned)}
          </motion.strong>
        </motion.li>
      ))}
    </ol>
  )
}
