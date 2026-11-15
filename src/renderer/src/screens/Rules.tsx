import type { Party } from '../../../core/party/party'
import type { RaceSetup } from '../../../core/game/race'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { PartyFrame } from '../components/PartyFrame'
import { send } from '../hooks'
import { gameName } from './Draw'

/** The rules card before a game, with the throwing order. */
export function Rules({ party }: { party: Party }): React.JSX.Element {
  const record = party.games.at(-1)!
  const rules = (strings.games as Record<string, { rules: readonly string[] }>)[record.gameId]?.rules ?? []
  // Games that deal segments to players show them with the throwing order.
  const segments = (record.setup as Partial<RaceSetup> | null)?.segments ?? null

  return (
    <PartyFrame party={party} title={gameName(record.gameId)}>
      <section className="rules">
        <ul className="rules__list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div>
          <h3>{strings.party.order}</h3>
          <ol className="order">
            {record.order.map((id) => {
              const player = playerOf(party, id)
              return (
                <li key={id} style={{ borderColor: colourOf(party, id) }}>
                  <Avatar avatar={player.avatar} size="2.4em" />
                  <span>{player.name}</span>
                  {segments && (
                    <strong style={{ color: colourOf(party, id) }}>{segments[id]!.join(' + ')}</strong>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>
      <footer className="bar bar--center">
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {strings.party.startGame}
        </button>
      </footer>
    </PartyFrame>
  )
}
