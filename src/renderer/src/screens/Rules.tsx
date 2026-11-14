import type { Evening } from '../../../core/evening/evening'
import type { RaceSetup } from '../../../core/game/race'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { EveningFrame } from '../components/EveningFrame'
import { send } from '../hooks'
import { gameName } from './Draw'

/** The rules card before a game, with the throwing order. */
export function Rules({ evening }: { evening: Evening }): React.JSX.Element {
  const record = evening.games.at(-1)!
  const rules = (strings.games as Record<string, { rules: readonly string[] }>)[record.gameId]?.rules ?? []
  const segments = record.gameId === 'race' ? (record.setup as RaceSetup).segments : null

  return (
    <EveningFrame evening={evening} title={gameName(record.gameId)}>
      <section className="rules">
        <ul className="rules__list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div>
          <h3>{strings.evening.order}</h3>
          <ol className="order">
            {record.order.map((id) => {
              const player = playerOf(evening, id)
              return (
                <li key={id} style={{ borderColor: colourOf(evening, id) }}>
                  <Avatar avatar={player.avatar} size="2.4em" />
                  <span>{player.name}</span>
                  {segments && (
                    <strong style={{ color: colourOf(evening, id) }}>{segments[id]!.join(' + ')}</strong>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>
      <footer className="bar bar--center">
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {strings.evening.startGame}
        </button>
      </footer>
    </EveningFrame>
  )
}
