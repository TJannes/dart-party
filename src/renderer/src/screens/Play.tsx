import { activeRecord, canAdvance, evaluateRecord, standings, type Evening } from '../../../core/evening/evening'
import { placesOf, pointsForRanking } from '../../../core/evening/points'
import { rulesFor } from '../../../core/game/registry'
import { rankByScore } from '../../../core/game/types'
import { dartLabel } from '../../../shared/board'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { Controls } from '../components/Controls'
import { EveningFrame } from '../components/EveningFrame'
import { send } from '../hooks'
import { DeciderScene } from '../scenes/DeciderScene'
import { RaceScene } from '../scenes/RaceScene'
import { gameName } from './Draw'

const s = strings.evening

/** The result of the game just finished, and the standings of the evening. */
function Result({ evening }: { evening: Evening }): React.JSX.Element {
  const record = activeRecord(evening)!
  const state = evaluateRecord(record)
  const places = placesOf(state.ranking)
  const isGame = evening.stage === 'playing'
  const earned = isGame ? pointsForRanking(state.ranking) : {}
  const totals = new Map(standings(evening).map((row) => [row.player, row.points]))
  // In the standings, players level on points share a place.
  const standingPlaces = placesOf(rankByScore([...totals.keys()], (id) => totals.get(id)!))
  const rows = isGame ? standings(evening).map((row) => row.player) : state.ranking.flat()

  return (
    <div className="result">
      <div className="result__card">
        <h2>{isGame ? s.standings : s.result(gameName(record.gameId))}</h2>
        <ol className="scoreboard">
          {rows.map((id) => {
            const player = playerOf(evening, id)
            return (
              <li key={id} style={{ borderColor: colourOf(evening, id) }}>
                <span className="scoreboard__place">{s.place(isGame ? standingPlaces[id]! : places[id]!)}</span>
                <Avatar avatar={player.avatar} size="2em" mood={places[id] === 1 ? 'cheer' : 'idle'} />
                <span className="scoreboard__name">{player.name}</span>
                {isGame && <span className="scoreboard__earned">{s.earned(earned[id] ?? 0)}</span>}
                {isGame && <strong>{s.points(totals.get(id) ?? 0)}</strong>}
              </li>
            )
          })}
        </ol>
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {strings.common.continue}
        </button>
      </div>
    </div>
  )
}

/** A game or deciding round in progress: who throws, the scene, the controls. */
export function Play({ evening }: { evening: Evening }): React.JSX.Element {
  const record = activeRecord(evening)!
  const state = evaluateRecord(record)
  const rules = rulesFor(record.gameId)
  const open = record.turns.at(-1)
  const darts = open && !open.done ? open.darts.map((d) => d.dart) : []
  const current = state.current
  const thrower = current ? playerOf(evening, current.player) : null

  return (
    <EveningFrame
      evening={evening}
      title={gameName(record.gameId)}
      detail={current && rules.maxRounds > 1 ? s.round(current.round, rules.maxRounds) : undefined}
    >
      <div className="turn" style={{ borderColor: current ? colourOf(evening, current.player) : 'transparent' }}>
        {thrower && current && (
          <>
            <Avatar avatar={thrower.avatar} size="1.5em" />
            <span className="turn__name">{thrower.name}</span>
            <span className="turn__what">{current.dartsLeft === 0 ? s.pullDarts : s.toThrow}</span>
            <span className="turn__darts">
              {Array.from({ length: rules.dartsPerTurn }, (_, slot) => (
                <span key={slot} className={darts[slot] ? 'dart' : 'dart dart--empty'}>
                  {darts[slot] ? dartLabel(darts[slot]) : ''}
                </span>
              ))}
            </span>
          </>
        )}
      </div>

      {record.gameId === 'race' && <RaceScene evening={evening} record={record} state={state} darts={darts} />}
      {record.gameId === 'decider' && <DeciderScene evening={evening} record={record} state={state} darts={darts} />}

      <Controls evening={evening} canThrow={current !== null && current.dartsLeft > 0} />
      {canAdvance(evening) && <Result evening={evening} />}
    </EveningFrame>
  )
}
