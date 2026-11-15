import { useState, type ReactNode } from 'react'
import type { Party } from '../../../core/party/party'
import { strings } from '../../../shared/strings'
import { send } from '../hooks'
import { BoardStatus } from './BoardStatus'
import { Modal } from './Modal'
import { Volume } from './Volume'

const s = strings.party

/** The frame around every screen of a party: where we are, and the way out. */
export function PartyFrame(props: { party: Party; title: string; detail?: string; children: ReactNode }): React.JSX.Element {
  const [stopping, setStopping] = useState(false)
  const [volume, setVolume] = useState(false)
  const { party } = props
  return (
    <main className="screen">
      <header className="bar">
        <h2>{props.title}</h2>
        <span className="bar__detail">
          {party.freePlay
            ? strings.freePlay.label
            : party.stage !== 'decider' && party.stage !== 'podium' && s.gameOf(party.games.length, party.gamesPlanned)}
          {props.detail ? ` · ${props.detail}` : ''}
        </span>
        <button type="button" className="button button--quiet" onClick={() => setVolume(true)}>
          {strings.settings.volume}
        </button>
        <button type="button" className="button button--quiet" onClick={() => setStopping(true)}>
          {party.freePlay ? strings.freePlay.stop : s.stop}
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
        <Modal title={party.freePlay ? strings.freePlay.stopQuestion : s.stopQuestion} onClose={() => setStopping(false)}>
          <div className="row">
            <button type="button" className="button button--miss" onClick={() => send({ type: 'abort' })}>
              {party.freePlay ? strings.freePlay.stopYes : s.stopYes}
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
