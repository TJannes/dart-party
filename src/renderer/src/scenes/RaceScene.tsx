import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import type { Dart } from '../../../core/board/state'
import type { Party, GameRecord } from '../../../core/party/party'
import type { RaceView } from '../../../core/game/race'
import type { GameState, PlayerId } from '../../../core/game/types'
import { useMoods } from '../animation/Stage'
import { colourOf, playerOf } from '../colours'
import { Avatar, type Mood } from '../components/Avatar'
import { Board } from '../components/Board'
import { Glass, useDrinks } from '../components/Drinks'
import { Bicycle, RaceCar, Scooter } from '../theme/gameShowProps'

/** How a racer feels, going by the last thing that happened. */
function moodOf(player: PlayerId, state: GameState<RaceView>): Mood {
  const { winner, moves } = state.view
  if (winner) return winner === player ? 'cheer' : 'sulk'
  const last = moves.at(-1)
  if (!last || last.player !== player) return 'idle'
  return last.to > last.from ? 'cheer' : 'sulk'
}

export function RaceScene(props: {
  party: Party
  record: GameRecord
  state: GameState<RaceView>
  darts: Dart[]
}): React.JSX.Element {
  const { party, record, state } = props
  const { segments, positions, trackLength } = state.view
  const moods = useMoods()
  const drinks = useDrinks(party)
  // A joke that changes nothing: whoever is last rides a kick scooter, and
  // with three places or more whoever is second to last a bicycle. The rest
  // drive a racing car, and so does everyone while they are all level.
  const places = [...new Set(record.order.map((id) => positions[id]!))].sort((a, b) => a - b)
  const vehicleOf = (id: PlayerId): 'car' | 'bike' | 'scooter' => {
    if (places.length < 2) return 'car'
    if (positions[id] === places[0]) return 'scooter'
    return places.length >= 3 && positions[id] === places[1] ? 'bike' : 'car'
  }
  const owners: Record<number, string> = {}
  for (const id of record.order) {
    for (const segment of segments[id] ?? []) owners[segment] = colourOf(party, id)
  }

  return (
    <section className="race">
      <div className="race__track" style={{ '--rows': record.order.length } as CSSProperties}>
        {record.order.map((id) => {
          const player = playerOf(party, id)
          const colour = colourOf(party, id)
          const active = state.current?.player === id
          return (
            <div key={id} className={active ? 'lane lane--race lane--active' : 'lane lane--race'} style={{ borderColor: colour }}>
              <div className="lane__who">
                <strong>{player.name}</strong>
                <span style={{ color: colour }}>
                  {segments[id]!.join(' + ')} <Glass drinks={drinks} player={id} />
                </span>
              </div>
              <div className="lane__road lane__road--race">
                {Array.from({ length: trackLength }, (_, step) => (
                  <i key={step} />
                ))}
                <motion.div
                  className="lane__racer lane__racer--car"
                  data-anim-avatar={id}
                  data-anim-score={id}
                  animate={{ left: `${(positions[id]! / trackLength) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                >
                  {/* The driver first, so the car is drawn over their chin: they sit in it. */}
                  <div className="car__driver">
                    <Avatar avatar={player.avatar} mood={moods[id] ?? moodOf(id, state)} />
                  </div>
                  <div className="car">
                    {vehicleOf(id) === 'scooter' ? (
                      <Scooter colour={colour} />
                    ) : vehicleOf(id) === 'bike' ? (
                      <Bicycle colour={colour} />
                    ) : (
                      <RaceCar colour={colour} />
                    )}
                  </div>
                </motion.div>
              </div>
              <div className="lane__flag" aria-hidden />
            </div>
          )
        })}
      </div>
      <div className="race__board" data-anim-board>
        <Board owners={owners} darts={props.darts} />
      </div>
    </section>
  )
}
