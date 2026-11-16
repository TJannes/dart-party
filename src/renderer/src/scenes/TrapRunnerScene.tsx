import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import type { Dart } from '../../../core/board/state'
import type { Party, GameRecord } from '../../../core/party/party'
import type { TrapRunnerView } from '../../../core/game/trapRunner'
import type { GameState, PlayerId } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { useMoods } from '../animation/Stage'
import { colourOf, playerOf } from '../colours'
import { Avatar, type Mood } from '../components/Avatar'
import { Board } from '../components/Board'
import { Glass, useDrinks } from '../components/Drinks'
import { Boulder, CaveExit, Idol, Torch } from '../theme/gameShowProps'

const t = strings.games.trapRunner

/** How a runner feels: the winner cheers, the rest go by the last dart. */
function moodOf(player: PlayerId, record: GameRecord, state: GameState<TrapRunnerView>): Mood {
  const { winner } = state.view
  if (winner) return winner === player ? 'cheer' : 'sulk'
  const feedback = state.feedback.at(-1)
  const thrower = state.throwers.findLast((_, turn) => record.turns[turn]!.darts.length > 0)
  if (!feedback || thrower !== player) return 'idle'
  return feedback === 'bad' ? 'sulk' : feedback === 'neutral' ? 'idle' : 'cheer'
}

/**
 * A corridor of the temple per player: stepping stones through the dark, a
 * torch at every rest stop and daylight at the end. Beside it the board
 * with the traps found this round.
 */
export function TrapRunnerScene(props: {
  party: Party
  record: GameRecord
  state: GameState<TrapRunnerView>
  darts: Dart[]
}): React.JSX.Element {
  const { party, record, state } = props
  const { positions, trackLength, restEvery, sprung, hidden } = state.view
  const moods = useMoods()
  const drinks = useDrinks(party)
  // A boulder rolls after whoever is last, once someone is ahead and there is room behind them. Only for show.
  const all = record.order.map((id) => positions[id]!)
  const last = Math.min(...all)
  const chased = (id: PlayerId): boolean => !state.finished && last >= 1 && last < Math.max(...all) && positions[id] === last

  return (
    <section className="race">
      <div className="race__track" style={{ '--rows': record.order.length + 2 } as CSSProperties}>
        <p className="scene__heading">{t.hidden(hidden)}</p>
        {record.order.map((id) => {
          const player = playerOf(party, id)
          const colour = colourOf(party, id)
          const active = state.current?.player === id
          return (
            <div key={id} className={active ? 'lane lane--cave lane--active' : 'lane lane--cave'} style={{ borderColor: colour }}>
              <div className="lane__who">
                <strong>{player.name}</strong>
                <span style={{ color: colour }}>
                  {t.at(positions[id]!, trackLength)} <Glass drinks={drinks} player={id} />
                </span>
              </div>
              {/* Where everyone starts: the treasure chamber. */}
              <div className="cave__start" aria-hidden>
                <Idol />
              </div>
              <div className="lane__road lane__road--cave">
                {Array.from({ length: trackLength }, (_, step) => (
                  <i key={step} />
                ))}
                {/* A torch burns at every rest stop: a trap never takes you back past it. */}
                {Array.from({ length: Math.ceil(trackLength / restEvery) - 1 }, (_, n) => (
                  <span key={n} className="cave__torch" style={{ left: `${(((n + 1) * restEvery) / trackLength) * 100}%` }}>
                    <Torch />
                  </span>
                ))}
                <motion.div
                  className="cave__boulder"
                  initial={false}
                  animate={{ left: `${(positions[id]! / trackLength) * 100}%`, opacity: chased(id) ? 1 : 0 }}
                  transition={{ left: { type: 'spring', stiffness: 60, damping: 16 }, opacity: { duration: 0.6 } }}
                  aria-hidden
                >
                  <Boulder />
                </motion.div>
                <motion.div
                  className="lane__racer"
                  data-anim-avatar={id}
                  data-anim-score={id}
                  animate={{ left: `${(positions[id]! / trackLength) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                >
                  <Avatar avatar={player.avatar} mood={moods[id] ?? moodOf(id, record, state)} />
                </motion.div>
              </div>
              <div className="cave__exit" aria-hidden>
                <CaveExit />
              </div>
            </div>
          )
        })}
      </div>
      <div className="race__board" data-anim-board>
        {/* A trap someone fell into stays open on the board until the round is over. */}
        <Board variant="temple" pits={sprung} darts={props.darts} />
      </div>
    </section>
  )
}
