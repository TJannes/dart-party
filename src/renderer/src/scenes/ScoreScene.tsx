import type { ReactNode } from 'react'
import type { Evening, GameRecord } from '../../../core/evening/evening'
import type { GameState, PlayerId } from '../../../core/game/types'
import { colourOf, playerOf } from '../colours'
import { Avatar, type Mood } from '../components/Avatar'

/** Who threw the last dart that counted, and what it did. */
function lastThrow(record: GameRecord, state: GameState<unknown>): { player: PlayerId; good: boolean } | null {
  const feedback = state.feedback.at(-1)
  if (!feedback) return null
  const thrower = state.throwers.findLast((_, turn) => record.turns[turn]!.darts.length > 0)
  if (thrower) return { player: thrower, good: feedback !== 'bad' && feedback !== 'neutral' }
  return null
}

function moodOf(player: PlayerId, record: GameRecord, state: GameState<unknown>): Mood {
  if (state.finished) return state.ranking[0]?.includes(player) ? 'cheer' : 'sulk'
  const last = lastThrow(record, state)
  if (!last || last.player !== player) return 'idle'
  return last.good ? 'cheer' : state.feedback.at(-1) === 'bad' ? 'sulk' : 'idle'
}

/**
 * The usual scene of a game where everyone collects something: a row per
 * player with their score, and the board beside it.
 */
export function ScoreScene(props: {
  evening: Evening
  record: GameRecord
  state: GameState<unknown>
  /** The big number of each player. */
  score: (player: PlayerId) => ReactNode
  /** A line under the name. */
  detail?: (player: PlayerId) => ReactNode
  /** Shown above the rows. */
  heading?: ReactNode
  /** Players who are out of the game: their row fades. */
  out?: readonly PlayerId[]
  board: ReactNode
}): React.JSX.Element {
  const { evening, record, state } = props
  return (
    <section className="race">
      <div className="race__track">
        {props.heading && <p className="scene__heading">{props.heading}</p>}
        {record.order.map((id) => {
          const player = playerOf(evening, id)
          const colour = colourOf(evening, id)
          return (
            <div
              key={id}
              className={
                state.current?.player === id ? 'lane lane--active' : props.out?.includes(id) ? 'lane lane--out' : 'lane'
              }
              style={{ borderColor: colour }}
            >
              <div className="lane__avatar">
                <Avatar avatar={player.avatar} mood={props.out?.includes(id) ? 'sulk' : moodOf(id, record, state)} />
              </div>
              <div className="lane__who lane__who--wide">
                <strong>{player.name}</strong>
                {props.detail && <span style={{ color: colour }}>{props.detail(id)}</span>}
              </div>
              <strong className="lane__score">{props.score(id)}</strong>
            </div>
          )
        })}
      </div>
      <div className="race__board">{props.board}</div>
    </section>
  )
}
