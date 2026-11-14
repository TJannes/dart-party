import { useState } from 'react'
import { activeRecord, type Evening } from '../../../core/evening/evening'
import { archeryPoints } from '../../../core/game/robinHood'
import { dartLabel } from '../../../shared/board'
import { strings } from '../../../shared/strings'
import { playerOf } from '../colours'
import { send } from '../hooks'
import { DartPicker } from './DartPicker'
import { Modal } from './Modal'

const s = strings.controls

interface Target {
  turn: number
  index: number
}

/** The last darts of the game, newest first, to pick one to correct. */
function recentDarts(evening: Evening): (Target & { label: string })[] {
  const record = activeRecord(evening)
  if (!record) return []
  const list: (Target & { label: string })[] = []
  record.turns.forEach((turn, turnIndex) => {
    const thrower = playerOf(evening, record.order[turnIndex % record.order.length]!)
    turn.darts.forEach((thrown, index) =>
      list.push({ turn: turnIndex, index, label: `${thrower.name}: ${
          record.gameId === 'robinHood' ? archeryPoints(thrown.dart) : dartLabel(thrown.dart)
        }` }),
    )
  })
  return list.reverse().slice(0, 9)
}

/**
 * What the control panel always offers during a game: add a miss, add or
 * correct a dart, move on by hand, reset the board.
 */
export function Controls({ evening, canThrow }: { evening: Evening; canThrow: boolean }): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [correcting, setCorrecting] = useState<Target | null>(null)
  const recent = recentDarts(evening)
  const zones = activeRecord(evening)?.gameId === 'robinHood'

  return (
    <div className="controls">
      <button type="button" className="button button--miss" disabled={!canThrow} onClick={() => send({ type: 'addDart', dart: { miss: true } })}>
        {s.miss}
      </button>
      <button type="button" className="button" disabled={!canThrow} onClick={() => setAdding(true)}>
        {s.addDart}
      </button>
      <button type="button" className="button" onClick={() => send({ type: 'removeLastDart' })}>
        {s.undo}
      </button>
      <button type="button" className="button" onClick={() => setChoosing(true)}>
        {s.correct}
      </button>
      <button type="button" className="button button--next" onClick={() => send({ type: 'nextPlayer' })}>
        {s.next}
      </button>
      <button type="button" className="button button--quiet" onClick={() => window.dartParty.resetBoard()}>
        {strings.board.reset}
      </button>

      {adding && (
        <DartPicker
          zones={zones}
          onClose={() => setAdding(false)}
          onPick={(dart) => {
            send({ type: 'addDart', dart })
            setAdding(false)
          }}
        />
      )}
      {choosing && (
        <Modal title={s.correctTitle} onClose={() => setChoosing(false)}>
          {recent.length === 0 && <p>{s.noDarts}</p>}
          <div className="correct-list">
            {recent.map((item) => (
              <button
                key={`${item.turn}-${item.index}`}
                type="button"
                className="key key--wide"
                onClick={() => {
                  setChoosing(false)
                  setCorrecting(item)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="button button--quiet" onClick={() => setChoosing(false)}>
            {strings.common.cancel}
          </button>
        </Modal>
      )}
      {correcting && (
        <DartPicker
          zones={zones}
          onClose={() => setCorrecting(null)}
          onPick={(dart) => {
            send({ type: 'correctDart', turn: correcting.turn, index: correcting.index, dart })
            setCorrecting(null)
          }}
        />
      )}
    </div>
  )
}
