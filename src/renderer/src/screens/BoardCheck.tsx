import { useEffect, useState } from 'react'
import type { BoardSnapshot } from '../../../core/board/tracker'
import { boardView, dartLabel, eventLabel } from '../../../shared/board'
import { strings } from '../../../shared/strings'

// A plain view of the Autodarts connection: is the board there, which darts
// are in it, what happened last. The real show replaces this later; until
// then it is how the connection is checked on a real board.

const LOG_LENGTH = 6

function useBoard(): { snapshot: BoardSnapshot; log: string[] } {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>({
    link: 'connecting',
    condition: null,
    cloudConnected: null,
    throws: [],
  })
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    const stopSnapshots = window.dartParty.onBoardSnapshot(setSnapshot)
    const stopEvents = window.dartParty.onBoardEvent((event) =>
      setLog((lines) => [eventLabel(event), ...lines].slice(0, LOG_LENGTH)),
    )
    void window.dartParty.getBoardSnapshot().then(setSnapshot)
    return () => {
      stopSnapshots()
      stopEvents()
    }
  }, [])

  return { snapshot, log }
}

export function BoardCheck({ onBack }: { onBack: () => void }): React.JSX.Element {
  const { snapshot, log } = useBoard()
  const view = boardView(snapshot)

  return (
    <section className="board">
      <p className="hint">{strings.home.boardCheckHint}</p>
      <p className={`board__status board__status--${view.tone}`} role="status">
        {view.message}
      </p>

      <div className="board__darts">
        {[0, 1, 2].map((slot) => {
          const dart = snapshot.throws[slot]
          return (
            <span key={slot} className={dart ? 'dart' : 'dart dart--empty'}>
              {dart ? dartLabel(dart) : ''}
            </span>
          )
        })}
      </div>

      {snapshot.cloudConnected === false && snapshot.link === 'online' && (
        <p className="small">{strings.board.cloudOffline}</p>
      )}

      <button
        type="button"
        className="button"
        disabled={!view.canReset}
        onClick={() => window.dartParty.resetBoard()}
      >
        {strings.board.reset}
      </button>

      <button type="button" className="button button--quiet" onClick={onBack}>
        {strings.common.back}
      </button>

      <ul className="board__log">
        {log.map((line, index) => (
          <li key={log.length - index}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
