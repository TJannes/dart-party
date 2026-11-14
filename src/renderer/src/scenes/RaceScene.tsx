import { motion } from 'motion/react'
import type { Dart } from '../../../core/board/state'
import type { Evening, GameRecord } from '../../../core/evening/evening'
import type { RaceView } from '../../../core/game/race'
import type { GameState, PlayerId } from '../../../core/game/types'
import { colourOf, playerOf } from '../colours'
import { Avatar, type Mood } from '../components/Avatar'
import { Board } from '../components/Board'

/** How a racer feels, going by the last thing that happened. */
function moodOf(player: PlayerId, state: GameState<RaceView>): Mood {
  const { winner, moves } = state.view
  if (winner) return winner === player ? 'cheer' : 'sulk'
  const last = moves.at(-1)
  if (!last || last.player !== player) return 'idle'
  return last.to > last.from ? 'cheer' : 'sulk'
}

export function RaceScene(props: {
  evening: Evening
  record: GameRecord
  state: GameState<RaceView>
  darts: Dart[]
}): React.JSX.Element {
  const { evening, record, state } = props
  const { segments, positions, trackLength } = state.view
  const owners: Record<number, string> = {}
  for (const id of record.order) {
    for (const segment of segments[id] ?? []) owners[segment] = colourOf(evening, id)
  }

  return (
    <section className="race">
      <div className="race__track">
        {record.order.map((id) => {
          const player = playerOf(evening, id)
          const colour = colourOf(evening, id)
          const active = state.current?.player === id
          return (
            <div key={id} className={active ? 'lane lane--active' : 'lane'} style={{ borderColor: colour }}>
              <div className="lane__who">
                <strong>{player.name}</strong>
                <span style={{ color: colour }}>{segments[id]!.join(' + ')}</span>
              </div>
              <div className="lane__road">
                {Array.from({ length: trackLength }, (_, step) => (
                  <i key={step} />
                ))}
                <motion.div
                  className="lane__racer"
                  animate={{ left: `${(positions[id]! / trackLength) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                >
                  <Avatar avatar={player.avatar} mood={moodOf(id, state)} />
                </motion.div>
              </div>
              <div className="lane__flag" aria-hidden />
            </div>
          )
        })}
      </div>
      <div className="race__board">
        <Board owners={owners} darts={props.darts} />
      </div>
    </section>
  )
}
