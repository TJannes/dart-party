import type { Party } from '../../../core/party/party'
import { drinkingNow } from '../../../core/party/drinking'
import { strings } from '../../../shared/strings'
import { colourOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { DrinkRulesText, GlassIcon } from '../components/Drinks'
import { PartyFrame } from '../components/PartyFrame'
import { send } from '../hooks'

const s = strings.drinking

/** The card with the drinking rules, before the first draw of a drinking game. */
export function DrinkRules({ party }: { party: Party }): React.JSX.Element {
  const sitOut = drinkingNow(party).sitOut
  return (
    <PartyFrame party={party} title={s.rulesTitle}>
      <section className="rules">
        <div className="rules__drinks">
          <DrinkRulesText rules={party.drinking?.rules ?? []} />
        </div>
        <ol className="order">
          {party.players.map((player) => {
            const out = sitOut.includes(player.id)
            return (
              <li key={player.id} style={{ borderColor: colourOf(party, player.id) }}>
                <Avatar avatar={player.avatar} size="2.4em" />
                <span>{player.name}</span>
                {out && <small>{s.sitsOut}</small>}
                <GlassIcon out={out} />
              </li>
            )
          })}
        </ol>
      </section>
      <footer className="bar bar--center">
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {s.rulesStart}
        </button>
      </footer>
    </PartyFrame>
  )
}
