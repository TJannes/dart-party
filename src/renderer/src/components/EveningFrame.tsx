import { useState, type ReactNode } from 'react'
import type { Evening } from '../../../core/evening/evening'
import { strings } from '../../../shared/strings'
import { send } from '../hooks'
import { BoardStatus } from './BoardStatus'
import { Modal } from './Modal'
import { Volume } from './Volume'

const s = strings.evening

/** The frame around every screen of an evening: where we are, and the way out. */
export function EveningFrame(props: { evening: Evening; title: string; detail?: string; children: ReactNode }): React.JSX.Element {
  const [stopping, setStopping] = useState(false)
  const [volume, setVolume] = useState(false)
  const { evening } = props
  return (
    <main className="screen">
      <header className="bar">
        <h2>{props.title}</h2>
        <span className="bar__detail">
          {evening.freePlay
            ? strings.freePlay.label
            : evening.stage !== 'decider' && evening.stage !== 'podium' && s.gameOf(evening.games.length, evening.gamesPlanned)}
          {props.detail ? ` · ${props.detail}` : ''}
        </span>
        <button type="button" className="button button--quiet" onClick={() => setVolume(true)}>
          {strings.settings.volume}
        </button>
        <button type="button" className="button button--quiet" onClick={() => setStopping(true)}>
          {evening.freePlay ? strings.freePlay.stop : s.stop}
        </button>
      </header>
      <BoardStatus />
      {props.children}
      {volume && (
        <Modal title={strings.settings.volume} onClose={() => setVolume(false)}>
          <Volume />
          <button type="button" className="button" onClick={() => setVolume(false)}>
            {strings.common.back}
          </button>
        </Modal>
      )}
      {stopping && (
        <Modal title={evening.freePlay ? strings.freePlay.stopQuestion : s.stopQuestion} onClose={() => setStopping(false)}>
          <div className="row">
            <button type="button" className="button button--miss" onClick={() => send({ type: 'abort' })}>
              {evening.freePlay ? strings.freePlay.stopYes : s.stopYes}
            </button>
            <button type="button" className="button" onClick={() => setStopping(false)}>
              {s.stopNo}
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
