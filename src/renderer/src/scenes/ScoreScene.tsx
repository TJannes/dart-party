import type { CSSProperties, ReactNode } from 'react'
import type { Party, GameRecord } from '../../../core/party/party'
import type { GameState, PlayerId } from '../../../core/game/types'
import { useMoods } from '../animation/Stage'
import { colourOf, playerOf } from '../colours'
import { Avatar, type Mood } from '../components/Avatar'
import { Glass, useDrinks } from '../components/Drinks'

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
  party: Party
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
  /** Who has reason to be nervous right now. */
  nervous?: (player: PlayerId) => boolean
  /** Who is blackened by a bomb. */
  scorched?: (player: PlayerId) => boolean
  /** Something a player holds, shown in their row before the score. */
  held?: (player: PlayerId) => ReactNode
  /** Something big of the game's own, above the board. */
  feature?: ReactNode
  /** Two players left: the lights go down. */
  duel?: boolean
  board: ReactNode
}): React.JSX.Element {
  const { party, record, state } = props
  const moods = useMoods()
  const drinks = useDrinks(party)
  // The animation in progress goes first, then how the game stands.
  const mood = (id: PlayerId): Mood =>
    moods[id] ?? (props.out?.includes(id) ? 'out' : props.nervous?.(id) ? 'sweat' : moodOf(id, record, state))
  return (
    <section className={props.duel ? 'race race--duel' : 'race'}>
      {/* A heading takes about the room of two rows. */}
      <div className="race__track" style={{ '--rows': record.order.length + (props.heading ? 2 : 0) } as CSSProperties}>
        {props.heading && <p className="scene__heading">{props.heading}</p>}
        {record.order.map((id) => {
          const player = playerOf(party, id)
          const colour = colourOf(party, id)
          return (
            <div
              key={id}
              className={
                state.current?.player === id ? 'lane lane--active' : props.out?.includes(id) ? 'lane lane--out' : 'lane'
              }
              style={{ borderColor: colour }}
            >
              <div className="lane__avatar" data-anim-avatar={id}>
                <Avatar avatar={player.avatar} mood={mood(id)} scorched={props.scorched?.(id)} />
              </div>
              <div className="lane__who lane__who--wide">
                <strong>{player.name}</strong>
                {props.detail && <span style={{ color: colour }}>{props.detail(id)}</span>}
              </div>
              {props.held?.(id)}
              <Glass drinks={drinks} player={id} />
              <strong className="lane__score" data-anim-score={id}>{props.score(id)}</strong>
            </div>
          )
        })}
      </div>
      <div className={props.feature ? 'race__board race__board--feature' : 'race__board'}>
        {props.feature}
        <div className="race__dartboard" data-anim-board>
          {props.board}
        </div>
      </div>
    </section>
  )
}
