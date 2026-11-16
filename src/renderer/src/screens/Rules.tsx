import { useMemo } from 'react'
import { rulesDemo } from '../../../core/party/demo'
import type { Party } from '../../../core/party/party'
import type { RaceSetup } from '../../../core/game/race'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { PartyFrame } from '../components/PartyFrame'
import { RulesDemo } from '../components/RulesDemo'
import { send } from '../hooks'
import { gameName } from './Draw'

interface GameText {
  rules?: readonly string[]
  short?: readonly string[]
  demo?: readonly string[]
}

/** The rules card before a game: the rules, the throwing order, and a demo when the game has one. */
export function Rules({ party }: { party: Party }): React.JSX.Element {
  const record = party.games.at(-1)!
  const text = (strings.games as Record<string, GameText>)[record.gameId] ?? {}
  // Games that deal segments to players show them with the throwing order.
  const segments = (record.setup as Partial<RaceSetup> | null)?.segments ?? null
  const steps = useMemo(() => rulesDemo(record, party.players), [record, party.players])
  const demo = steps && text.demo ? { steps, captions: text.demo } : null
  const rules = (demo && text.short) || text.rules || []

  const list = (
    <ul className="rules__list">
      {rules.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  )
  const order = (
    <div>
      <h3>{strings.party.order}</h3>
      <ol className={demo ? 'order order--row' : 'order'}>
        {record.order.map((id) => {
          const player = playerOf(party, id)
          return (
            <li key={id} style={{ borderColor: colourOf(party, id) }}>
              <Avatar avatar={player.avatar} size={demo ? '1.6em' : '2.4em'} />
              <span>{player.name}</span>
              {segments && <strong style={{ color: colourOf(party, id) }}>{segments[id]!.join(' + ')}</strong>}
            </li>
          )
        })}
      </ol>
    </div>
  )

  return (
    <PartyFrame party={party} title={gameName(record.gameId)}>
      {demo ? (
        <section className="rules rules--demo">
          <div className="rules__text">
            {list}
            {order}
          </div>
          <RulesDemo key={record.gameId} steps={demo.steps} captions={demo.captions} />
        </section>
      ) : (
        <section className="rules">
          {list}
          {order}
        </section>
      )}
      <footer className="bar bar--center">
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {strings.party.startGame}
        </button>
      </footer>
    </PartyFrame>
  )
}
