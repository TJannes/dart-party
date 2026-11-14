import type { Dart } from '../../../core/board/state'
import type { Evening, GameRecord } from '../../../core/evening/evening'
import type { DeciderView } from '../../../core/game/decider'
import type { GameState } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { Board } from '../components/Board'

export function DeciderScene(props: {
  evening: Evening
  record: GameRecord
  state: GameState<DeciderView>
  darts: Dart[]
}): React.JSX.Element {
  const { evening, record, state } = props
  const best = Math.max(...Object.values(state.view.scores))
  return (
    <section className="race">
      <div className="race__track">
        <p className="hint">{strings.evening.tie}</p>
        {record.order.map((id) => {
          const player = playerOf(evening, id)
          const score = state.view.scores[id]!
          const mood = state.finished ? (score === best ? 'cheer' : 'sulk') : 'idle'
          return (
            <div
              key={id}
              className={state.current?.player === id ? 'lane lane--active' : 'lane'}
              style={{ borderColor: colourOf(evening, id) }}
            >
              <Avatar avatar={player.avatar} mood={mood} size="1.6em" />
              <div className="lane__who">
                <strong>{player.name}</strong>
              </div>
              <strong className="lane__score">{score}</strong>
            </div>
          )
        })}
      </div>
      <div className="race__board">
        <Board darts={props.darts} />
      </div>
    </section>
  )
}
